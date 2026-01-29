
export interface DocumentChunk {
  id: string;
  docId: string;
  text: string;
  embedding?: number[];
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
  status: 'indexing' | 'ready' | 'error';
  chunks: DocumentChunk[];
  // Position pour le Spatial Canvas
  x?: number;
  y?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  citations?: DocumentChunk[]; 
  thinking?: boolean;
  // Position pour le Spatial Canvas
  x?: number;
  y?: number;
}

export interface ExtractedEntity {
  id: string;
  name: string;
  type: 'concept' | 'person' | 'location' | 'metric' | 'date' | 'other';
  description: string;
  sourceDoc: string;
}

export type AppView = 'chat' | 'spatial' | 'data' | 'podcast';

export type AIProvider = 'gemini' | 'openai' | 'ollama' | 'openrouter';

export type EmbeddingProvider = 'local' | 'gemini' | 'openai';

export type AIRole = 'analyst' | 'tutor' | 'critic' | 'creative' | 'coder';

export interface AISettings {
  provider: AIProvider;
  embeddingProvider: EmbeddingProvider;
  geminiKey: string;
  openaiKey: string;
  openrouterKey: string;
  ollamaUrl: string; // e.g. http://localhost:11434
  modelName: string; // e.g. gemini-1.5-flash or gpt-4o
}

export interface ActiveCitation {
  fileId: string;
  chunkId: string;
  textSnippet: string;
}
