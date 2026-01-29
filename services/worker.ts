
import { pipeline, env } from '@xenova/transformers';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from "@google/genai";

// --- CONFIG ---
env.allowLocalModels = false;
env.useBrowserCache = true;

// Fix for pdfjs-dist import
const pdf = (pdfjsLib as any).default || pdfjsLib;
if (pdf.GlobalWorkerOptions) {
  pdf.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// Singleton for the worker's embedding pipeline
let workerPipeline: any = null;

const getWorkerPipeline = async () => {
  if (!workerPipeline) {
    self.postMessage({ type: 'status', status: 'indexing', message: 'Loading Neural Model...' });
    workerPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return workerPipeline;
};

// --- CLEANING STRATEGIES ---

const cleanGenericText = (text: string): string => {
  return text
    // Fix hyphenated words at end of lines (e.g. "re-\nport" -> "report")
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Remove isolated page numbers (e.g. " 12 ", "- 4 -")
    .replace(/\n\s*-?\s*\d+\s*-?\s*\n/g, '\n')
    // Remove "Page X of Y" patterns
    .replace(/Page \d+ of \d+/gi, '')
    // Normalize whitespace, but keep paragraph breaks
    .replace(/[ \t]+/g, ' ')
    // Fix broken newlines within sentences
    .replace(/([a-z,])\n([a-z])/g, '$1 $2');
};

const cleanCodeOrMarkdown = (text: string): string => {
  // For code/MD, we must preserve indentation and newlines!
  // We only remove null bytes or replacement characters
  return text.replace(/\uFFFD/g, '');
};

// --- CHUNKING STRATEGIES ---

interface Chunk {
  id: string;
  docId: string;
  text: string;
  metadata?: any;
}

// 1. MARKDOWN / CODE SPLITTER
const splitMarkdown = (text: string, maxSize: number): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";
  const lines = text.split('\n');
  let insideCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
    }
    const isHeader = line.startsWith('#') || line.startsWith('##') || line.startsWith('###');
    if (currentChunk.length + line.length > maxSize) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
    }
    if (isHeader && !insideCodeBlock && currentChunk.length > maxSize * 0.5) {
       chunks.push(currentChunk.trim());
       currentChunk = "";
    }
    currentChunk += line + "\n";
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
};

// 2. CSV SPLITTER
const splitCSV = (text: string, maxSize: number): string[] => {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [text]; 
  const headers = lines[0].split(',').map(h => h.trim());
  const chunks: string[] = [];
  let currentChunk = "";

  for (let i = 1; i < lines.length; i++) {
    const rowValues = lines[i].split(','); 
    const rowDescription = headers.map((h, idx) => {
      const val = rowValues[idx] || "N/A";
      return `${h}: ${val.trim()}`;
    }).join(', ');

    if (currentChunk.length + rowDescription.length > maxSize) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += rowDescription + "\n";
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
};

// 3. GENERIC RECURSIVE SPLITTER
const splitTextRecursive = (text: string, maxSize: number): string[] => {
  if (text.length <= maxSize) return [text];
  const paragraphs = text.split(/\n\n/);
  if (paragraphs.length > 1) return bundleChunks(paragraphs, maxSize, "\n\n");
  const sentences = text.split(/(?<=[.?!])\s+/);
  if (sentences.length > 1) return bundleChunks(sentences, maxSize, " ");
  const lines = text.split(/\n/);
  if (lines.length > 1) return bundleChunks(lines, maxSize, "\n");
  const mid = Math.floor(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
};

const bundleChunks = (pieces: string[], maxSize: number, separator: string): string[] => {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const piece of pieces) {
    const pieceLen = piece.length;
    if (currentLength + pieceLen + separator.length > maxSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(separator));
        const lastPiece = currentChunk[currentChunk.length - 1];
        currentChunk = [lastPiece]; 
        currentLength = lastPiece.length;
      }
    }
    currentChunk.push(piece);
    currentLength += pieceLen + separator.length;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join(separator));
  return chunks;
};

// --- PDF EXTRACTION ---
const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const loadingTask = pdf.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const pagePromises = Array.from({ length: doc.numPages }, async (_, i) => {
      const page = await doc.getPage(i + 1);
      const textContent = await page.getTextContent();
      if (!textContent.items || textContent.items.length === 0) return "";
      
      const items = textContent.items.map((item: any) => ({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          w: item.width
      }));
      const LINE_TOLERANCE = 5;
      const lines: { y: number; items: any[] }[] = [];
      for (const item of items) {
          const match = lines.find(l => Math.abs(l.y - item.y) < LINE_TOLERANCE);
          if (match) match.items.push(item);
          else lines.push({ y: item.y, items: [item] });
      }
      lines.sort((a, b) => b.y - a.y);
      return lines.map(line => {
          line.items.sort((a, b) => a.x - b.x);
          let lineText = "";
          let lastXEnd = -100;
          for (const item of line.items) {
              if (lastXEnd >= 0) {
                  const gap = item.x - lastXEnd;
                  if (gap > 20) lineText += " \t ";
                  else if (gap > 5) lineText += " ";
              }
              lineText += item.str;
              lastXEnd = item.x + (item.w || 0);
          }
          return lineText;
      }).join("\n");
  });
  const pageTexts = await Promise.all(pagePromises);
  return pageTexts.join("\n\n");
};

// --- EMBEDDING ---
const calculateEmbedding = async (text: string, settings: any) => {
  // 1. LOCAL
  if (settings.embeddingProvider === 'local') {
    const pipe = await getWorkerPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
  
  // 2. OPENAI (New in Worker)
  if (settings.embeddingProvider === 'openai') {
    if (!settings.openaiKey) return null;
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.openaiKey}`
      },
      body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  }

  // 3. GEMINI
  const key = settings.geminiKey || settings.envKey;
  if (!key) return null;
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: [{ parts: [{ text }] }]
  });
  return response.embeddings?.[0]?.values || null;
};

// --- MAIN HANDLER ---
self.onmessage = async (e: MessageEvent) => {
  const { fileData, fileName, fileType, fileId, settings } = e.data;

  try {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileType === 'application/pdf' || extension === 'pdf';
    const isCSV = fileType === 'text/csv' || extension === 'csv';
    const isCode = ['js', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'md'].includes(extension || '');
    
    self.postMessage({ type: 'status', status: 'indexing', message: `Parsing ${extension?.toUpperCase()}...` });
    
    let rawText = '';
    if (isPDF) {
       rawText = await extractTextFromPDF(fileData);
    } else {
       const dec = new TextDecoder();
       rawText = dec.decode(fileData);
    }

    if (!rawText.trim()) throw new Error("File content is empty or unreadable.");

    let chunksText: string[] = [];
    let cleanedContent = '';
    const TARGET_CHUNK_SIZE = 1000;

    if (isCSV) {
      cleanedContent = rawText;
      self.postMessage({ type: 'status', status: 'indexing', message: 'Processing Structured Data...' });
      chunksText = splitCSV(rawText, TARGET_CHUNK_SIZE);
    } 
    else if (isCode) {
      cleanedContent = cleanCodeOrMarkdown(rawText);
      self.postMessage({ type: 'status', status: 'indexing', message: 'Analyzing Code Blocks...' });
      chunksText = splitMarkdown(cleanedContent, TARGET_CHUNK_SIZE);
    } 
    else {
      cleanedContent = cleanGenericText(rawText);
      self.postMessage({ type: 'status', status: 'indexing', message: 'Chunking Text...' });
      chunksText = splitTextRecursive(cleanedContent, TARGET_CHUNK_SIZE);
    }

    const processedChunks: any[] = [];
    const BATCH_LIMIT = 50; 
    const chunksToProcess = chunksText.slice(0, BATCH_LIMIT); 
    
    let completed = 0;
    for (const text of chunksToProcess) {
       if (text.length < 15) continue; 

       self.postMessage({ 
         type: 'status', 
         status: 'indexing', 
         message: `Embedding chunk ${completed + 1}/${chunksToProcess.length}...` 
       });
       
       try {
         const embedding = await calculateEmbedding(text, settings);
         if (embedding) {
           processedChunks.push({ 
             id: `${fileId}-${completed}`,
             docId: fileName,
             text: text,
             embedding 
           });
         }
       } catch (err) {
         console.warn("Embedding failed", err);
       }
       completed++;
    }

    self.postMessage({
      type: 'complete',
      result: {
        id: fileId,
        name: fileName,
        type: fileType,
        content: cleanedContent, 
        size: fileData.byteLength,
        status: 'ready',
        chunks: processedChunks
      }
    });

  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
