
import { GoogleGenAI } from "@google/genai";
import { DocumentChunk, Message, ExtractedEntity, AISettings, AIRole } from "../types";
import { pipeline, env } from '@xenova/transformers';
import { SYSTEM_ROLES } from "../constants";

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

// Chat APIs expect the conversation to start with a user turn, and OpenAI-style
// APIs call the AI role 'assistant' (not 'model').
const toChatHistory = (history: Message[]): Message[] => {
  const turns = history.filter(m => m.role !== 'system' && m.content.trim());
  const firstUser = turns.findIndex(m => m.role === 'user');
  return firstUser === -1 ? [] : turns.slice(firstUser);
};

const toOpenAIRole = (role: Message['role']) => (role === 'model' ? 'assistant' : role);

// --- EMBEDDINGS (Memory) ---

export const getEmbedding = async (text: string, settings: AISettings): Promise<number[] | null> => {
  // 1. Local (Offline) Provider
  if (settings.embeddingProvider === 'local') {
    try {
      const pipe = await getLocalEmbeddingPipeline();
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error("Local Embedding Error:", error);
      return null;
    }
  }

  // 2. OpenAI Provider (New)
  if (settings.embeddingProvider === 'openai') {
    if (!settings.openaiKey) return null;
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.openaiKey}`
        },
        body: JSON.stringify({
            model: "text-embedding-3-small", // Standard efficient model
            input: text
        })
      });
      if (!response.ok) throw new Error(`OpenAI Embedding Failed (${response.status})`);
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("OpenAI Embedding Error:", error);
      return null;
    }
  }

  // 3. Gemini (Cloud) Provider
  const key = settings.geminiKey || process.env.API_KEY;
  if (!key) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: [{ parts: [{ text }] }]
    });
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    return null;
  }
};

// --- RETRIEVAL ---

// Below this many characters the whole library fits comfortably in a prompt,
// so we send everything instead of risking an empty / partial retrieval
// (e.g. "summarize this document" has no semantic match with any single chunk).
const FULL_CONTEXT_CHAR_BUDGET = 24000;
const MAX_CONTEXT_CHARS = 30000;

const tokenize = (text: string): string[] =>
  Array.from(new Set(
    text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 2)
  ));

// Files indexed without usable chunks (embedding failed, older versions...)
// still carry their full text: rebuild plain chunks so they remain searchable.
export const ensureChunks = (file: { id: string; name: string; content: string; chunks: DocumentChunk[] }): DocumentChunk[] => {
  if (file.chunks.length > 0 || !file.content?.trim()) return file.chunks;
  const size = 1000;
  const out: DocumentChunk[] = [];
  for (let i = 0; i < file.content.length; i += size) {
    out.push({ id: `${file.id}-t${out.length}`, docId: file.name, text: file.content.slice(i, i + size) });
  }
  return out;
};

export const retrieveContext = async (
  query: string, 
  allChunks: DocumentChunk[], 
  settings: AISettings,
  topK: number = 8
): Promise<DocumentChunk[]> => {
  if (allChunks.length === 0) return [];

  const totalChars = allChunks.reduce((n, c) => n + c.text.length, 0);
  if (totalChars <= FULL_CONTEXT_CHAR_BUDGET) return allChunks;

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await getEmbedding(query, settings);
  } catch (error) {
    console.warn("Query embedding failed, falling back to keyword search", error);
  }

  const queryTokens = tokenize(query);

  const scored = allChunks.map((chunk, index) => {
    const lower = chunk.text.toLowerCase();
    const keyword = queryTokens.length
      ? queryTokens.filter(t => lower.includes(t)).length / queryTokens.length
      : 0;
    const semantic = queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;
    return { chunk, index, score: semantic + 0.4 * keyword };
  });

  // No hard similarity threshold: always return the best candidates so the
  // model never gets an empty context for a library that has content.
  const best = scored.sort((a, b) => b.score - a.score).slice(0, topK);

  let used = 0;
  const kept = best.filter(({ chunk }) => {
    if (used + chunk.text.length > MAX_CONTEXT_CHARS) return false;
    used += chunk.text.length;
    return true;
  });

  // Present in document order so the model reads coherent passages.
  return kept.sort((a, b) => a.index - b.index).map(({ chunk }) => chunk);
};

// --- GENERATION (The Multi-Provider Engine) ---

const callModel = async (
  systemPrompt: string,
  history: Message[],
  settings: AISettings,
  temperature: number
): Promise<string> => {
  const recentHistory = toChatHistory(history.filter(m => m.role !== 'system').slice(-10));

  try {
    // --- 1. GEMINI PROVIDER ---
    if (settings.provider === 'gemini') {
      if (!settings.geminiKey && !process.env.API_KEY) throw new Error("Missing Gemini API Key");
      
      const ai = new GoogleGenAI({ apiKey: settings.geminiKey || process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-3-flash-preview',
        contents: recentHistory.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: { systemInstruction: systemPrompt, temperature }
      });
      return response.text || "No response.";
    }

    // --- 2. OPENROUTER PROVIDER ---
    if (settings.provider === 'openrouter') {
        if (!settings.openrouterKey) throw new Error("Missing OpenRouter Key");

        const messages = [
            { role: "system", content: systemPrompt },
            ...recentHistory.map(m => ({ role: toOpenAIRole(m.role), content: m.content }))
        ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.openrouterKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "IRIE Knowledge OS"
            },
            body: JSON.stringify({
                model: settings.modelName || "meta-llama/llama-3-8b-instruct:free",
                messages,
                temperature
            })
        });

        if (!response.ok) {
           const err = await response.json().catch(() => ({}));
           throw new Error(`OpenRouter Error: ${err.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || "No response.";
    }

    // --- 3. OLLAMA PROVIDER (Local) ---
    if (settings.provider === 'ollama') {
        const baseUrl = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
        
        const fullPrompt = `${systemPrompt}\n\nChat History:\n${recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nMODEL ANSWER:`;

        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName || 'llama3',
                prompt: fullPrompt,
                stream: false,
                options: { temperature, num_ctx: 8192 }
            })
        });

        if (!response.ok) {
          throw new Error(`Ollama returned ${response.status}. Is the model "${settings.modelName || 'llama3'}" pulled?`);
        }
        const data = await response.json();
        return data.response;
    }

    // --- 4. OPENAI PROVIDER ---
    if (settings.provider === 'openai') {
        if (!settings.openaiKey) throw new Error("Missing OpenAI API Key");

        const messages = [
            { role: "system", content: systemPrompt },
            ...recentHistory.map(m => ({ role: toOpenAIRole(m.role), content: m.content }))
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.openaiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName || "gpt-4o",
                messages,
                temperature
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${err.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || "No response.";
    }

    throw new Error("Provider not supported.");

  } catch (error: any) {
    console.error("Generation Error:", error);
    // A failed fetch is almost always CORS / network, e.g. a browser on a remote
    // site cannot reach the visitor's local Ollama unless OLLAMA_ORIGINS allows it.
    if (error instanceof TypeError && settings.provider === 'ollama') {
      throw new Error(`Cannot reach Ollama at ${settings.ollamaUrl || 'http://localhost:11434'}. Make sure it is running and started with OLLAMA_ORIGINS="*" (browser CORS).`);
    }
    throw error;
  }
};

export const generateRAGResponse = async (
  history: Message[], 
  contextChunks: DocumentChunk[],
  settings: AISettings,
  activeRole: AIRole = 'analyst',
  documentNames: string[] = []
): Promise<string> => {
  const contextText = contextChunks.map(c => `[Source: ${c.docId}]\n${c.text}`).join("\n\n");
  const rolePrompt = SYSTEM_ROLES[activeRole].systemPrompt;

  const finalSystemPrompt = `
    You are IRIE, a Knowledge Operating System.
    
    CURRENT ROLE: ${rolePrompt}
    
    INSTRUCTIONS:
    1. Base your answer on the DOCUMENT EXCERPTS below. They come from the user's uploaded documents.
    2. Respond in the same language as the user's question.
    3. Use Markdown formatting.
    4. If the excerpts do not contain the answer, say so plainly and suggest how to rephrase. Never claim the document failed to load when excerpts are present.
    
    UPLOADED DOCUMENTS: ${documentNames.length ? documentNames.join(', ') : 'none'}
    
    DOCUMENT EXCERPTS:
    ${contextText || '(none retrieved for this question)'}
  `;

  return callModel(finalSystemPrompt, history, settings, activeRole === 'creative' ? 0.7 : 0.3);
};

// --- DATA EXTRACTION ---

const parseJsonArray = (raw: string): any[] => {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error("The model did not return a JSON list.");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("The model did not return a JSON list.");
  return parsed;
};

const ENTITY_TYPES = ['concept', 'person', 'location', 'metric', 'date', 'other'];

export const extractStructuredData = async (
  files: { name: string; content: string }[],
  settings: AISettings
): Promise<ExtractedEntity[]> => {
  const usable = files.filter(f => f.content?.trim());
  if (usable.length === 0) return [];

  // Share a fixed text budget across documents so each one is represented.
  const perFile = Math.max(3000, Math.floor(30000 / usable.length));
  const corpus = usable
    .map(f => `=== DOCUMENT: ${f.name} ===\n${f.content.slice(0, perFile)}`)
    .join("\n\n");

  const system = "You extract structured data from documents. Reply with ONLY a valid JSON array, no commentary, no markdown fences.";
  const prompt = `Extract the key entities from the documents below.
Return a JSON array of objects with exactly these keys:
- "name": short entity name
- "type": one of ${ENTITY_TYPES.join(', ')}
- "description": one sentence, in the language of the document
- "sourceDoc": the exact document name the entity comes from

DOCUMENTS:
${corpus}`;

  const raw = await callModel(system, [{ id: 'x', role: 'user', content: prompt, timestamp: Date.now() }], settings, 0.1);

  let parsed: any[];
  try {
    parsed = parseJsonArray(raw);
  } catch (error: any) {
    throw new Error(`Could not read the extraction result (${error.message}). Try a more capable model.`);
  }

  return parsed
    .filter(item => item && typeof item.name === 'string')
    .map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      type: ENTITY_TYPES.includes(item.type) ? item.type : 'other',
      description: String(item.description ?? ''),
      sourceDoc: String(item.sourceDoc ?? '')
    }));
};
