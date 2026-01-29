import React, { useRef, useEffect } from 'react';
import { Message, DocumentChunk } from '../types';
import { Icon } from './Icon';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onCitationClick: (citation: DocumentChunk) => void;
  onClearChat?: () => void;
  onDeleteMessage?: (id: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, input, setInput, onSend, isLoading, onCitationClick, onClearChat, onDeleteMessage }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-20"></div>

      {/* Header overlay for actions */}
      {messages.length > 0 && (
         <div className="absolute top-0 right-0 p-4 z-20">
             <button 
                onClick={onClearChat}
                className="flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight/50 backdrop-blur hover:bg-red-500/20 border border-white/5 hover:border-red-500/50 rounded text-[10px] text-textDim hover:text-red-400 transition-all"
             >
                 <Icon name="Eraser" size={12} />
                 CLEAR SESSION
             </button>
         </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 z-10 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
            <Icon name="BrainCircuit" size={64} className="mb-4 text-textDim" />
            <h2 className="text-2xl font-bold tracking-tight">IRIE INTELLIGENCE</h2>
            <p className="mt-2 text-sm">Waiting for input stream...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`group flex flex-col max-w-3xl mx-auto ${msg.role === 'user' ? 'items-end' : 'items-start'} relative`}>
             <div className="flex items-center gap-2 mb-2 opacity-50 text-xs font-mono uppercase">
                <span>{msg.role === 'user' ? 'Operator' : 'IRIE'}</span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </div>
             
             {/* Delete Button (Visible on hover) */}
             <button
                onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                className={`
                    absolute top-6 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-textDim hover:text-red-400
                    ${msg.role === 'user' ? '-left-8' : '-right-8'}
                `}
                title="Delete Message"
             >
                 <Icon name="Trash" size={14} />
             </button>
             
             <div className={`
               p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap
               ${msg.role === 'user' 
                 ? 'bg-white text-black' 
                 : 'bg-surfaceHighlight border border-white/5 text-text shadow-xl'}
             `}>
               {msg.content}
             </div>

             {/* Citations */}
             {msg.citations && msg.citations.length > 0 && (
               <div className="mt-2 flex gap-2 flex-wrap max-w-2xl">
                  {msg.citations.map((cite, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => onCitationClick(cite)}
                      className="flex items-center gap-1 bg-black/40 border border-white/10 px-2 py-1 rounded text-[10px] text-accent font-mono cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all group"
                    >
                      <Icon name="FileText" size={10} className="group-hover:text-white" />
                      <span className="truncate max-w-[150px]">{cite.docId}</span>
                      <span className="opacity-50">#{idx + 1}</span>
                    </button>
                  ))}
               </div>
             )}
          </div>
        ))}

        {isLoading && (
          <div className="max-w-3xl mx-auto flex items-center gap-3">
             <div className="w-4 h-4 bg-primary animate-pulse rounded-sm"></div>
             <span className="text-xs font-mono text-textDim animate-pulse">COMPUTING...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 z-20">
        <div className="max-w-3xl mx-auto glass-panel p-2 rounded-xl flex gap-2 items-end shadow-2xl">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Interrogate data..."
            className="flex-1 bg-transparent text-sm text-text placeholder-textDim/50 resize-none outline-none p-3 h-14 max-h-32 font-sans"
          />
          <button 
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 flex items-center justify-center bg-primary text-black rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="ArrowUp" size={18} />
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-2 text-center">
            <p className="text-[10px] text-textDim/40 font-mono">
                System access restricted. All interactions are processed locally within the current session.
            </p>
        </div>
      </div>
    </div>
  );
};