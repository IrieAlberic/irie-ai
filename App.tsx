
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { SpatialCanvas } from './components/SpatialCanvas';
import { DataView } from './components/DataView';
import { SettingsModal } from './components/SettingsModal';
import { DocumentViewer } from './components/DocumentViewer';
import { LandingPage } from './components/LandingPage';
import { Icon } from './components/Icon';
import { processFile } from './services/documentProcessor';
import { retrieveContext, generateRAGResponse, extractStructuredData, ensureChunks } from './services/ai';
import { UploadedFile, AppView, Message, ExtractedEntity, AISettings, DocumentChunk, AIRole } from './types';
import { db, updateFilePosition, updateMessagePosition, deleteFileFromDb, deleteMessageFromDb, clearMessagesFromDb, purgeDatabase } from './services/db';

const App: React.FC = () => {
  // Application State
  const [hasLaunched, setHasLaunched] = useState(false);
  
  const [view, setView] = useState<AppView>('chat');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedEntity[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Active Role State
  const [activeRole, setActiveRole] = useState<AIRole>('analyst');

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'gemini',
    embeddingProvider: 'local', // Defaulting to Local for offline-first
    geminiKey: process.env.API_KEY || '', 
    openaiKey: '',
    openrouterKey: '',
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
      try {
        setAiSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        localStorage.removeItem('irie_ai_settings');
      }
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
        if (persistedData.length > 0) setExtractedData(persistedData);

        // BOOT SEQUENCE: If no messages exist, introduce IRIE (Clean Version)
        if (persistedMessages.length === 0) {
            const bootMessage: Message = {
                id: 'system-boot',
                role: 'model',
                content: `**SYSTEM ONLINE.**\n\nGreetings. I am **IRIE**, your Local-First Knowledge Operating System.\n\nI am designed to analyze your private documents securely within this browser. No data leaves your device without your explicit command.\n\n**To begin:**\n\n1. Upload a PDF, CSV, or Markdown file using the sidebar.\n2. Select a Persona (Analyst, Tutor, Coder) from the menu below.\n3. Ask questions to interrogate your data.\n\n*Waiting for data ingestion...*`,
                timestamp: Date.now()
            };
            setMessages([bootMessage]);
            // We save it so it persists on reload until cleared
            await db.messages.add(bootMessage);
        } else {
            setMessages(persistedMessages);
        }

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

  // --- HANDLERS (CRUD) ---

  const handleDeleteFile = async (id: string) => {
    if (window.confirm("Permanently delete this file and its index?")) {
        setFiles(prev => prev.filter(f => f.id !== id));
        if (viewingFileId === id) setViewingFileId(null);
        await deleteFileFromDb(id);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    await deleteMessageFromDb(id);
  };

  const handleClearChat = async () => {
    if (window.confirm("Clear current session history?")) {
        setMessages([]);
        await clearMessagesFromDb();
        
        // Re-inject boot message after clear for better UX? 
        // Optional, but let's keep it clean for now.
    }
  };

  const handlePurgeData = async () => {
     if (window.confirm("FACTORY RESET: This will delete ALL files, indexes, and messages. Are you sure?")) {
         await purgeDatabase();
         setFiles([]);
         setMessages([]);
         setExtractedData([]);
         setViewingFileId(null);
         window.location.reload(); 
     }
  };

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
        const readyFiles = files.filter(f => f.status === 'ready');
        const allChunks = readyFiles.flatMap(ensureChunks);
        let context: DocumentChunk[] = [];
        
        if (forceContext) {
            context = [{
                id: 'force-ctx',
                docId: 'Selected Node',
                text: forceContext.slice(0, 30000)
            }];
        } else {
             // Retrieve context
             context = await retrieveContext(userMsg.content, allChunks, aiSettings);
        }

        // Pass activeRole to generator
        const responseText = await generateRAGResponse(
            [...messages, userMsg], 
            context, 
            aiSettings, 
            activeRole,
            readyFiles.map(f => f.name)
        );

        const aiMsg: Message = {
            id: crypto.randomUUID(),
            role: 'model',
            content: responseText,
            timestamp: Date.now(),
            citations: context.slice(0, 6)
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
    setExtractionError(null);
    try {
      const data = await extractStructuredData(
        files.filter(f => f.status === 'ready').map(f => ({ name: f.name, content: f.content })),
        aiSettings
      );
      if (data.length === 0) {
        setExtractionError("No entities were found in your documents.");
      } else {
        await db.extractedData.clear();
        setExtractedData(data);
        await db.extractedData.bulkPut(data); // Batch save
      }
    } catch (err) {
      setExtractionError((err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCitationClick = (citation: DocumentChunk) => {
    const file = files.find(f => f.name === citation.docId || f.chunks.some(c => c.id === citation.id));
    if (file) {
      setViewingFileId(file.id);
      setHighlightText(citation.text);
    }
  };

  // Each visitor brings their own key: tell them clearly when it is missing.
  const missingKeyProvider =
    aiSettings.provider === 'gemini' ? (!aiSettings.geminiKey && !process.env.API_KEY ? 'Gemini' : null)
    : aiSettings.provider === 'openai' ? (!aiSettings.openaiKey ? 'OpenAI' : null)
    : aiSettings.provider === 'openrouter' ? (!aiSettings.openrouterKey ? 'OpenRouter' : null)
    : null;

  const viewingFile = files.find(f => f.id === viewingFileId);

  // --- RENDER ---
  
  if (!hasLaunched) {
      return <LandingPage onLaunch={() => setHasLaunched(true)} />;
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-background text-text overflow-hidden font-sans animate-in fade-in duration-500">
      <Sidebar 
        files={files} 
        onUpload={handleFileUpload} 
        onDeleteFile={handleDeleteFile}
        currentView={view} 
        onViewChange={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 min-w-0 relative h-full flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden absolute top-0 left-0 z-30 p-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-surfaceHighlight/80 backdrop-blur border border-white/10 text-textDim hover:text-white"
            aria-label="Open menu"
          >
            <Icon name="Menu" size={18} />
          </button>
        </div>

        {missingKeyProvider && (
          <div className="shrink-0 z-30 flex items-center justify-between gap-3 px-4 py-2 pl-16 md:pl-4 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-400">
            <span>
              Add your own {missingKeyProvider} API key to start chatting. It stays in your browser and is never sent to our servers.
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 px-3 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 font-bold"
            >
              ADD KEY
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 relative flex">
        <div className="flex-1 h-full relative">
            {view === 'chat' && (
                <ChatInterface 
                    messages={messages} 
                    input={input} 
                    setInput={setInput} 
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    onCitationClick={handleCitationClick}
                    onClearChat={handleClearChat}
                    onDeleteMessage={handleDeleteMessage}
                    activeRole={activeRole}
                    onRoleChange={setActiveRole}
                />
            )}
            {view === 'spatial' && (
                <SpatialCanvas 
                    files={files} 
                    messages={messages} 
                    onSummarize={handleSummarizeNode}
                    onNodeMove={handleNodeMove}
                    onDeleteNode={(id, type) => type === 'file' ? handleDeleteFile(id) : handleDeleteMessage(id)}
                />
            )}
            {view === 'data' && (
                <DataView 
                    data={extractedData} 
                    isLoading={isExtracting} 
                    onRefresh={handleDataExtraction}
                    error={extractionError}
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
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={aiSettings}
        onSave={handleSaveSettings}
        onPurgeData={handlePurgeData}
      />
    </div>
  );
};

export default App;
