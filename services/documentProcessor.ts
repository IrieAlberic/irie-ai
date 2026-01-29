import { DocumentChunk, UploadedFile, AISettings } from "../types";
import { getEmbedding } from "./ai";
import * as pdfjsLib from 'pdfjs-dist';

// Fix for pdfjs-dist import structure in ESM environments (esm.sh)
const pdf = (pdfjsLib as any).default || pdfjsLib;

// Config Worker PDF.js
if (pdf.GlobalWorkerOptions) {
  pdf.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// --- CONFIGURATION EXPERTE ---
const TARGET_CHUNK_SIZE = 1000;
const MIN_CHUNK_SIZE = 200;

// --- TEXT CLEANING ENGINE ---

const cleanTextContent = (text: string): string => {
  return text
    // 1. Fix Hyphenation (ex: "communica-\ntion" -> "communication")
    .replace(/(\w)-\n(\w)/g, '$1$2') 
    // 2. Remove isolated page numbers (ex: "Page 1 of 10" or just digits on a line)
    .replace(/\n\s*\d+\s*\n/g, '\n') 
    .replace(/\n\s*Page \d+\s*\n/g, '\n')
    // 3. Normalize whitespace (keep paragraph breaks \n\n but remove formatting spaces, KEEP TABS for tables)
    .replace(/[ ]+/g, ' ')
    // 4. Fix broken newlines within sentences (common in PDF columns)
    // If a line ends with a lowercase letter and next starts with lowercase, join them.
    .replace(/([a-z,])\n([a-z])/g, '$1 $2');
};

// --- SEMANTIC CHUNKING ENGINE ---

const splitTextRecursive = (
  text: string, 
  maxSize: number
): string[] => {
  // If text fits, return it
  if (text.length <= maxSize) return [text];

  // Strategy 1: Split by Double Newline (Paragraphs)
  const paragraphs = text.split(/\n\n/);
  if (paragraphs.length > 1) {
    return bundleChunks(paragraphs, maxSize, "\n\n");
  }

  // Strategy 2: Split by Sentence (Period + Space)
  const sentences = text.split(/(?<=[.?!])\s+/);
  if (sentences.length > 1) {
    return bundleChunks(sentences, maxSize, " ");
  }

  // Strategy 3: Split by Newline
  const lines = text.split(/\n/);
  if (lines.length > 1) {
    return bundleChunks(lines, maxSize, "\n");
  }

  // Strategy 4: Hard split (fallback)
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
        // Overlap: keep last piece
        const lastPiece = currentChunk[currentChunk.length - 1];
        currentChunk = [lastPiece]; 
        currentLength = lastPiece.length;
      }
    }

    currentChunk.push(piece);
    currentLength += pieceLen + separator.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(separator));
  }

  return chunks;
};

const createSemanticChunks = (text: string, docId: string): Omit<DocumentChunk, 'embedding'>[] => {
  const cleanedText = cleanTextContent(text);
  const rawChunks = splitTextRecursive(cleanedText, TARGET_CHUNK_SIZE);
  
  return rawChunks.map((chunkText, index) => ({
    id: `${docId}-${index}`,
    docId: docId,
    text: chunkText.trim()
  })).filter(c => c.text.length > 20); 
};

// --- PDF EXTRACTION (Advanced Layout Aware) ---

const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    const loadingTask = pdf.getDocument({ data: arrayBuffer });
    const doc = await loadingTask.promise;
    
    // Parallel Page Processing for Speed
    const pagePromises = Array.from({ length: doc.numPages }, async (_, i) => {
        const pageNum = i + 1;
        try {
            const page = await doc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            if (!textContent.items || textContent.items.length === 0) return "";

            // Map items with geometry
            const items = textContent.items.map((item: any) => ({
                str: item.str,
                x: item.transform[4], // translateX
                y: item.transform[5], // translateY
                w: item.width,
                hasEOL: item.hasEOL
            }));

            // 1. Group by Lines (Y-axis clustering with tolerance)
            const LINE_TOLERANCE = 4; // px
            const lines: { y: number; items: any[] }[] = [];

            for (const item of items) {
                const match = lines.find(l => Math.abs(l.y - item.y) < LINE_TOLERANCE);
                if (match) {
                    match.items.push(item);
                } else {
                    lines.push({ y: item.y, items: [item] });
                }
            }

            // 2. Sort Lines Top-to-Bottom (Descending Y)
            lines.sort((a, b) => b.y - a.y);

            // 3. Construct Text preserving columns/tables
            return lines.map(line => {
                // Sort items Left-to-Right
                line.items.sort((a, b) => a.x - b.x);

                let lineText = "";
                let lastXEnd = -100;

                for (const item of line.items) {
                    if (lastXEnd >= 0) {
                        const gap = item.x - lastXEnd;
                        // Detect visual columns
                        if (gap > 15) {
                            lineText += " \t "; // Distinct separator for large gaps
                        } else if (gap > 4) {
                            lineText += " ";
                        }
                    }
                    lineText += item.str;
                    lastXEnd = item.x + (item.w || 0);
                }
                return lineText;
            }).join("\n");

        } catch (e) {
            console.warn(`Error parsing page ${pageNum}`, e);
            return "";
        }
    });

    const pageTexts = await Promise.all(pagePromises);
    return pageTexts.join("\n\n");

  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to parse PDF content");
  }
};

export const processFile = async (
  file: File, 
  settings: AISettings,
  onProgress: (status: UploadedFile['status']) => void
): Promise<UploadedFile> => {
  return new Promise(async (resolve, reject) => {
    try {
      let textContent = '';
      const fileId = crypto.randomUUID();

      onProgress('indexing');

      // 1. Extraction
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        textContent = await extractTextFromPDF(arrayBuffer);
      } else {
        textContent = await file.text();
      }

      if (!textContent.trim()) {
         throw new Error("File is empty or could not be read");
      }

      // 2. Semantic Chunking
      const semanticChunks = createSemanticChunks(textContent, file.name);
      
      const processedChunks: DocumentChunk[] = [];

      // 3. Vectorization (Batching)
      const BATCH_LIMIT = 50; 
      const chunksToProcess = semanticChunks.slice(0, BATCH_LIMIT);
      
      console.log(`Processing ${chunksToProcess.length} semantic chunks for ${file.name}`);

      // Process chunks using the selected embedding provider (via settings)
      for (const chunk of chunksToProcess) {
        try {
            const embedding = await getEmbedding(chunk.text, settings);
            if (embedding) {
              processedChunks.push({ ...chunk, embedding });
            }
        } catch (e) {
            console.warn(`Failed to embed chunk ${chunk.id}`);
        }
      }

      resolve({
        id: fileId,
        name: file.name,
        type: file.type,
        content: cleanTextContent(textContent), 
        size: file.size,
        status: 'ready',
        chunks: processedChunks
      });

    } catch (err) {
      console.error(err);
      onProgress('error');
      reject(err);
    }
  });
};