
import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, DocumentChunk, AIRole } from '../types';
import { Icon } from './Icon';
import { SYSTEM_ROLES } from '../constants';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onCitationClick: (citation: DocumentChunk) => void;
  onClearChat?: () => void;
  onDeleteMessage?: (id: string) => void;
  // Role Props
  activeRole: AIRole;
  onRoleChange: (role: AIRole) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    messages, input, setInput, onSend, isLoading, onCitationClick, onClearChat, onDeleteMessage,
    activeRole, onRoleChange
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const currentRoleDef = SYSTEM_ROLES[activeRole];

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-20"></div>

      {/* Header overlay for actions */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
         {/* Left Side: Empty or Breadcrumbs */}
         <div></div>

         {/* Right Side: Actions */}
         {messages.length > 0 && (
             <button 
                onClick={onClearChat}
                className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight/50 backdrop-blur hover:bg-red-500/20 border border-white/5 hover:border-red-500/50 rounded text-[10px] text-textDim hover:text-red-400 transition-all"
             >
                 <Icon name="Eraser" size={12} />
                 CLEAR SESSION
             </button>
         )}
      </div>

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
               p-4 rounded-lg text-sm leading-relaxed shadow-xl
               ${msg.role === 'user' 
                 ? 'bg-white text-black' 
                 : 'bg-surfaceHighlight border border-white/5 text-text'}
             `}>
               {/* Rendering Markdown with Tailwind styles */}
               <ReactMarkdown
                 components={{
                   ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                   ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                   li: ({node, ...props}) => <li className="" {...props} />,
                   p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                   strong: ({node, ...props}) => <span className={`font-bold ${msg.role === 'user' ? 'text-black' : 'text-white'}`} {...props} />,
                   h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-2" {...props} />,
                   h2: ({node, ...props}) => <h2 className="text-md font-bold mb-2 mt-2" {...props} />,
                   h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                   code: ({node, ...props}) => <code className={`${msg.role === 'user' ? 'bg-black/10' : 'bg-black/30 text-accent'} px-1 py-0.5 rounded font-mono text-xs`} {...props} />,
                   pre: ({node, ...props}) => <pre className="bg-black/50 p-3 rounded-md mb-2 overflow-x-auto text-xs font-mono border border-white/10" {...props} />,
                   blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-accent/50 pl-3 italic opacity-80 my-2" {...props} />,
                 }}
               >
                 {msg.content}
               </ReactMarkdown>
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
             <span className="text-xs font-mono text-textDim animate-pulse">
                {activeRole === 'tutor' ? 'GENERATING LESSON...' : 'COMPUTING...'}
             </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 z-20 relative">
        <div className="max-w-3xl mx-auto glass-panel p-2 rounded-xl flex flex-col shadow-2xl relative">
            
            {/* Role Selector Trigger */}
            <div className="flex justify-between items-center px-2 pb-2 border-b border-white/5 mb-1">
                <div className="relative">
                    <button 
                        onClick={() => setShowRoleSelector(!showRoleSelector)}
                        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors hover:text-white ${currentRoleDef.color}`}
                    >
                        <Icon name={currentRoleDef.icon as any} size={14} />
                        {currentRoleDef.label}
                        <Icon name="ChevronUp" size={12} className={`transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showRoleSelector && (
                        <div className="absolute bottom-8 left-0 w-64 bg-surface border border-border rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
                            <div className="p-2 space-y-1">
                                {Object.values(SYSTEM_ROLES).map((role) => (
                                    <div 
                                        key={role.id}
                                        className={`
                                            w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors group cursor-pointer
                                            ${activeRole === role.id ? 'bg-white/10 text-white' : 'text-textDim hover:bg-white/5 hover:text-white'}
                                        `}
                                        onClick={() => { onRoleChange(role.id); setShowRoleSelector(false); }}
                                    >
                                        {/* Label & Icon */}
                                        <div className="flex items-center gap-3">
                                            <Icon name={role.icon as any} size={14} className={activeRole === role.id ? role.color : ''} />
                                            <span>{role.label}</span>
                                        </div>

                                        {/* Info Icon with Tooltip */}
                                        <div 
                                            className="relative group/info ml-2 p-1"
                                            onClick={(e) => e.stopPropagation()} 
                                        >
                                            <Icon name="Info" size={12} className="opacity-50 hover:opacity-100 hover:text-accent transition-opacity" />
                                            
                                            {/* Tooltip Content */}
                                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black border border-white/10 rounded shadow-xl text-[10px] text-textDim leading-relaxed opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50">
                                                {role.description}
                                                <div className="absolute bottom-[-4px] right-1.5 w-2 h-2 bg-black border-r border-b border-white/10 transform rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Close Dropdown on Click Outside (Overlay) */}
                {showRoleSelector && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowRoleSelector(false)}></div>
                )}
            </div>

            {/* Input Field */}
            <div className="flex gap-2 items-end">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                    }
                    }}
                    placeholder={`Interrogate data as ${currentRoleDef.label}...`}
                    className="flex-1 bg-transparent text-sm text-text placeholder-textDim/50 resize-none outline-none p-2 h-14 max-h-32 font-sans"
                />
                <button 
                    onClick={onSend}
                    disabled={!input.trim() || isLoading}
                    className={`h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${activeRole === 'tutor' ? 'bg-green-500 text-black' : 'bg-primary text-black'}`}
                >
                    <Icon name="ArrowUp" size={18} />
                </button>
            </div>
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
