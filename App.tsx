import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { SpatialCanvas } from './components/SpatialCanvas';
import { DataView } from './components/DataView';
import { SettingsModal } from './components/SettingsModal';
import { DocumentViewer } from './components/DocumentViewer';
import { Icon } from './components/Icon';
import { processFile } from './services/documentProcessor';
import { retrieveContext, generateRAGResponse, extractStructuredData } from './services/ai';
import { UploadedFile, AppView, Message, ExtractedEntity, AISettings, DocumentChunk } from './types';
import { db, updateFilePosition, updateMessagePosition } from './services/db';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('chat');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedEntity[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'gemini',
    embeddingProvider: 'local', // Defaulting to Local for offline-first
    geminiKey: process.env.API_KEY || '', 
    openaiKey: '',
    ollamaUrl: 'http://localhost:11434',
    modelName: 'gemini-3-flash-preview'
  });

  // Deep Linking State
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string | undefined>(undefined);

  // --- INITIALIZATION & PERSISTENCE ---

  // Load settings from local storage
  useEffect(() => {
    const saved = localStorage.getItem('irie_ai_settings');
    if (saved) {
      setAiSettings(JSON.parse(saved));
    }
  }, []);

  // Load Data from IndexedDB on Mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const persistedFiles = await db.files.toArray();
        const persistedMessages = await db.messages.orderBy('timestamp').toArray();
        const persistedData = await db.extractedData.toArray();

        if (persistedFiles.length > 0) setFiles(persistedFiles);
        if (persistedMessages.length > 0) setMessages(persistedMessages);
        if (persistedData.length > 0) setExtractedData(persistedData);
      } catch (err) {
        console.error("Failed to load IndexedDB data", err);
      }
    };
    loadPersistedData();
  }, []);

  // Save settings to local storage
  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('irie_ai_settings', JSON.stringify(newSettings));
  };

  // --- HANDLERS ---

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: File[] = Array.from(e.target.files);
      
      for (const file of newFiles) {
        // Optimistic UI update
        const tempId = crypto.randomUUID();
        const tempFile: UploadedFile = {
            id: tempId,
            name: file.name,
            type: file.type,
            content: '',
            size: file.size,
            status: 'indexing',
            chunks: []
        };

        setFiles(prev => [...prev, tempFile]);

        try {
            const processed = await processFile(file, aiSettings, (status) => {
                // Update status if needed
            });
            
            // Update State AND Database
            setFiles(prev => prev.map(f => f.id === tempId ? processed : f));
            await db.files.add(processed);

        } catch (error) {
            console.error("Failed to process file", error);
            setFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'error' } : f));
        }
      }
    }
  };

  // Chat Handler
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    await processUserMessage(input);
  };

  const processUserMessage = async (text: string, forceContext?: string) => {
    // Only check key if using Gemini for generation
    if (aiSettings.provider === 'gemini' && !aiSettings.geminiKey && !process.env.API_KEY) {
        setIsSettingsOpen(true);
        alert("Please configure your Gemini API Key first.");
        return;
    }

    const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now()
    };

    // Update UI & DB
    setMessages(prev => [...prev, userMsg]);
    await db.messages.add(userMsg);

    setInput('');
    setIsLoading(true);

    try {
        const allChunks = files.flatMap(f => f.chunks);
        let context: DocumentChunk[] = [];
        
        if (forceContext) {
            context = [{
                id: 'force-ctx',
                docId: 'Selected Node',
                text: forceContext
            }];
        } else {
             context = await retrieveContext(userMsg.content, allChunks, aiSettings);
        }

        const responseText = await generateRAGResponse([...messages, userMsg], context, aiSettings);

        const aiMsg: Message = {
            id: crypto.randomUUID(),
            role: 'model',
            content: responseText,
            timestamp: Date.now(),
            citations: context
        };

        // Update UI & DB
        setMessages(prev => [...prev, aiMsg]);
        await db.messages.add(aiMsg);

    } catch (err) {
        const errorMsg: Message = {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Error: ${(err as Error).message}. Check your settings.`,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  // Handle Node Movement in Spatial Canvas (Persistence)
  const handleNodeMove = async (id: string, x: number, y: number, type: 'file' | 'message') => {
    // Update local state to avoid flicker/jump
    if (type === 'file') {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
        await updateFilePosition(id, x, y);
    } else {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, x, y } : m));
        await updateMessagePosition(id, x, y);
    }
  };

  const handleSummarizeNode = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    const prompt = `Summarize the document "${file.name}" in 3 bullet points.`;
    await processUserMessage(prompt, file.content);
  };

  const handleDataExtraction = async () => {
    if (files.length === 0) return;
    setIsExtracting(true);
    const contents = files.map(f => f.content);
    const data = await extractStructuredData(contents, aiSettings);
    
    setExtractedData(data);
    await db.extractedData.bulkPut(data); // Batch save
    
    setIsExtracting(false);
  };

  const handleCitationClick = (citation: DocumentChunk) => {
    const file = files.find(f => f.name === citation.docId || f.chunks.some(c => c.id === citation.id));
    if (file) {
      setViewingFileId(file.id);
      setHighlightText(citation.text);
    }
  };

  const viewingFile = files.find(f => f.id === viewingFileId);

  return (
    <div className="flex h-screen w-screen bg-background text-text overflow-hidden font-sans">
      <Sidebar 
        files={files} 
        onUpload={handleFileUpload} 
        currentView={view} 
        onViewChange={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-1 relative h-full flex">
        <div className="flex-1 h-full relative">
            {view === 'chat' && (
                <ChatInterface 
                    messages={messages} 
                    input={input} 
                    setInput={setInput} 
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    onCitationClick={handleCitationClick}
                />
            )}
            {view === 'spatial' && (
                <SpatialCanvas 
                    files={files} 
                    messages={messages} 
                    onSummarize={handleSummarizeNode}
                    onNodeMove={handleNodeMove}
                />
            )}
            {view === 'data' && (
                <DataView 
                    data={extractedData} 
                    isLoading={isExtracting} 
                    onRefresh={handleDataExtraction}
                />
            )}
            {view === 'podcast' && (
                 <div className="flex flex-col items-center justify-center h-full text-textDim relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 to-transparent pointer-events-none" />
                    <Icon name="Mic" size={64} className="mb-6 text-purple-500/50 animate-pulse" />
                    <h2 className="text-2xl font-bold text-white mb-2">Neural Podcast Engine</h2>
                    <p className="max-w-md text-center text-sm">
                        This module will transform your documents into an interactive audio conversation between two AI hosts.
                    </p>
                    <span className="mt-8 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-widest text-accent">
                        Coming Soon in v1.0
                    </span>
                 </div>
            )}
        </div>

        {viewingFile && (
            <DocumentViewer 
                file={viewingFile} 
                highlightText={highlightText} 
                onClose={() => { setViewingFileId(null); setHighlightText(undefined); }} 
            />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={aiSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;