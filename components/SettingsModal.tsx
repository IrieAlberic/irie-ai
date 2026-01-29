import React from 'react';
import { AISettings, AIProvider } from '../types';
import { Icon } from './Icon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AISettings>(settings);

  if (!isOpen) return null;

  const handleChange = (field: keyof AISettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[500px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surfaceHighlight/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Icon name="Settings" className="text-accent" />
              System Configuration
            </h2>
            <p className="text-xs text-textDim mt-1">Configure your Neural Engine provider.</p>
          </div>
          <button onClick={onClose} className="text-textDim hover:text-white transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Embedding Provider Selector */}
          <div className="space-y-3">
             <label className="text-xs font-mono uppercase text-textDim">Knowledge Indexing (Embeddings)</label>
             <div className="grid grid-cols-2 gap-2">
                 <button
                    onClick={() => handleChange('embeddingProvider', 'local')}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all
                      ${localSettings.embeddingProvider === 'local' 
                        ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                        : 'bg-surfaceHighlight border-transparent text-textDim hover:bg-white/5'}
                    `}
                  >
                    <span className="font-bold text-xs flex items-center gap-2"><Icon name="Cpu" size={14}/> LOCAL (OFFLINE)</span>
                    <span className="text-[9px] opacity-70">Runs in browser. Private.</span>
                  </button>
                  <button
                    onClick={() => handleChange('embeddingProvider', 'gemini')}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all
                      ${localSettings.embeddingProvider === 'gemini' 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-surfaceHighlight border-transparent text-textDim hover:bg-white/5'}
                    `}
                  >
                    <span className="font-bold text-xs flex items-center gap-2"><Icon name="Cloud" size={14}/> GEMINI (CLOUD)</span>
                    <span className="text-[9px] opacity-70">Requires API Key. Fast.</span>
                  </button>
             </div>
             {localSettings.embeddingProvider === 'local' && (
                 <p className="text-[10px] text-textDim italic text-center">
                    Using 'Xenova/all-MiniLM-L6-v2'. Model will be downloaded once (approx 45MB).
                 </p>
             )}
          </div>

          <div className="border-t border-white/5 my-2"></div>

          {/* Provider Selector */}
          <div className="space-y-3">
             <label className="text-xs font-mono uppercase text-textDim">Reasoning Provider (LLM)</label>
             <div className="grid grid-cols-3 gap-2">
                {(['gemini', 'openai', 'ollama'] as AIProvider[]).map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleChange('provider', provider)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all
                      ${localSettings.provider === provider 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-surfaceHighlight border-transparent text-textDim hover:bg-white/5'}
                    `}
                  >
                    <span className="capitalize font-bold text-sm">{provider}</span>
                  </button>
                ))}
             </div>
          </div>

          {/* Dynamic Fields */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            
            {localSettings.provider === 'gemini' && (
               <div className="space-y-2">
                  <label className="text-xs text-textDim">Gemini API Key</label>
                  <input 
                    type="password" 
                    value={localSettings.geminiKey}
                    onChange={(e) => handleChange('geminiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none"
                  />
                  <label className="text-xs text-textDim">Model Name</label>
                  <input 
                    type="text" 
                    value={localSettings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="gemini-3-flash-preview"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-textDim focus:border-accent outline-none font-mono"
                  />
               </div>
            )}

            {localSettings.provider === 'openai' && (
               <div className="space-y-2">
                  <label className="text-xs text-textDim">OpenAI API Key</label>
                  <input 
                    type="password" 
                    value={localSettings.openaiKey}
                    onChange={(e) => handleChange('openaiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none"
                  />
                  <label className="text-xs text-textDim">Model Name</label>
                  <input 
                    type="text" 
                    value={localSettings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-textDim focus:border-accent outline-none font-mono"
                  />
               </div>
            )}

            {localSettings.provider === 'ollama' && (
               <div className="space-y-2">
                  <label className="text-xs text-textDim">Ollama URL</label>
                  <input 
                    type="text" 
                    value={localSettings.ollamaUrl}
                    onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none font-mono"
                  />
                  <label className="text-xs text-textDim">Model Tag</label>
                  <input 
                    type="text" 
                    value={localSettings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="llama3:latest"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-textDim focus:border-accent outline-none font-mono"
                  />
                  <p className="text-[10px] text-yellow-500/50 mt-1">
                    Note: Ensure Ollama is running with CORS enabled (OLLAMA_ORIGINS="*").
                  </p>
               </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-surfaceHighlight/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-textDim hover:text-white transition-colors">
            CANCEL
          </button>
          <button 
            onClick={() => { onSave(localSettings); onClose(); }}
            className="px-6 py-2 bg-white text-black text-xs font-bold rounded hover:bg-white/90 transition-colors"
          >
            SAVE CONFIGURATION
          </button>
        </div>

      </div>
    </div>
  );
};