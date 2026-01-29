import { GoogleGenAI, Type } from "@google/genai";
import { DocumentChunk, Message, ExtractedEntity, AISettings } from "../types";
import { pipeline, env } from '@xenova/transformers';

// --- CONFIG FOR LOCAL MODELS ---
env.allowLocalModels = false; // Must be false for browser env to use CDN
env.useBrowserCache = true;

// Singleton to hold the pipeline
let embeddingPipeline: any = null;

const getLocalEmbeddingPipeline = async () => {
  if (!embeddingPipeline) {
    console.log("Loading local embedding model (Xenova/all-MiniLM-L6-v2)...");
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipeline;
};

// --- HELPERS ---

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) return 0; // Dimensionality mismatch check
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// --- EMBEDDINGS (Memory) ---

export const getEmbedding = async (text: string, settings: AISettings): Promise<number[] | null> => {
  // 1. Local (Offline) Provider
  if (settings.embeddingProvider === 'local') {
    try {
      const pipe = await getLocalEmbeddingPipeline();
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      // Convert Tensor to plain array
      return Array.from(output.data);
    } catch (error) {
      console.error("Local Embedding Error:", error);
      return null;
    }
  }

  // 2. Gemini (Cloud) Provider
  const key = settings.geminiKey || process.env.API_KEY;
  if (!key) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [{ parts: [{ text }] }]
    });
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    return null;
  }
};

// --- RETRIEVAL ---

export const retrieveContext = async (
  query: string, 
  allChunks: DocumentChunk[], 
  settings: AISettings,
  topK: number = 5
): Promise<DocumentChunk[]> => {
  if (allChunks.length === 0) return [];

  // Generate embedding for the query using the configured provider
  const queryEmbedding = await getEmbedding(query, settings);
  if (!queryEmbedding) return [];

  const scoredChunks = allChunks.map(chunk => {
    if (!chunk.embedding) return { ...chunk, score: -1 };
    return {
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    };
  });

  return scoredChunks
    .filter(c => c.score > 0.4) // Threshold might need tuning between models
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};

// --- GENERATION (The Multi-Provider Engine) ---

export const generateRAGResponse = async (
  history: Message[], 
  contextChunks: DocumentChunk[],
  settings: AISettings
): Promise<string> => {
  const contextText = contextChunks.map(c => `[Source: ${c.docId}]\n${c.text}`).join("\n\n");
  
  const systemPrompt = `
    You are IRIE, an advanced Knowledge Operating System designed for clarity and efficiency.
    
    INSTRUCTIONS:
    1. Answer strictly based on the provided CONTEXT.
    2. Be concise, technical, and professional. NO EMOJIS.
    3. Use Markdown.
    4. If info is missing, say "Data not found in source index."
    
    CONTEXT DATA:
    ${contextText}
  `;

  try {
    // --- 1. GEMINI PROVIDER ---
    if (settings.provider === 'gemini') {
      if (!settings.geminiKey && !process.env.API_KEY) throw new Error("Missing Gemini API Key");
      
      const ai = new GoogleGenAI({ apiKey: settings.geminiKey || process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-3-flash-preview',
        contents: history.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        }
      });
      return response.text || "No response.";
    }

    // --- 2. OLLAMA PROVIDER (Local) ---
    if (settings.provider === 'ollama') {
        const baseUrl = settings.ollamaUrl || 'http://localhost:11434';
        
        // Construct prompt manually for Ollama
        const fullPrompt = `${systemPrompt}\n\nChat History:\n${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nMODEL ANSWER:`;

        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName || 'llama3',
                prompt: fullPrompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error("Ollama connection failed");
        const data = await response.json();
        return data.response;
    }

    // --- 3. OPENAI PROVIDER ---
    if (settings.provider === 'openai') {
        if (!settings.openaiKey) throw new Error("Missing OpenAI API Key");

        const messages = [
            { role: "system", content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content }))
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.openaiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName || "gpt-4o",
                messages: messages,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`OpenAI API Error: ${err.error?.message}`);
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || "No response.";
    }

    return "Provider not supported.";

  } catch (error: any) {
    console.error("Generation Error:", error);
    return `System Error: ${error.message}`;
  }
};

// --- DATA EXTRACTION (Currently stuck to Gemini for complex JSON schema support) ---
export const extractStructuredData = async (
  filesContent: string[],
  settings: AISettings
): Promise<ExtractedEntity[]> => {
  if (filesContent.length === 0) return [];
  
  // Note: structured output is best with Gemini/OpenAI. 
  // We use the Gemini Key from settings if available, else fallback
  const key = settings.geminiKey || process.env.API_KEY;
  if (!key) return [];

  const combinedText = filesContent.join("\n\n").slice(0, 20000);

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze text and extract key entities. Return JSON list.
      TEXT: ${combinedText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["concept", "person", "location", "metric", "date", "other"] },
              description: { type: Type.STRING },
              sourceDoc: { type: Type.STRING }
            },
            required: ["name", "type", "description"]
          }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    const parsed = JSON.parse(jsonStr);
    return parsed.map((item: any) => ({ ...item, id: crypto.randomUUID() }));

  } catch (error) {
    console.error("Data Extraction Error:", error);
    return [];
  }
};