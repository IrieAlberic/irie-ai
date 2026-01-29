
import React from 'react';
import { AISettings, AIProvider, EmbeddingProvider } from '../types';
import { Icon } from './Icon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
  onPurgeData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onPurgeData }) => {
  const [localSettings, setLocalSettings] = React.useState<AISettings>(settings);

  if (!isOpen) return null;

  const handleChange = (field: keyof AISettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (mode: 'offline' | 'cloud') => {
    if (mode === 'offline') {
      setLocalSettings(prev => ({
        ...prev,
        embeddingProvider: 'local',
        provider: 'ollama',
        modelName: 'llama3'
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        embeddingProvider: 'gemini', // Default to Gemini for ease
        provider: 'gemini',
        modelName: 'gemini-3-flash-preview'
      }));
    }
  };

  const isPrivacyWarningNeeded = localSettings.embeddingProvider === 'local' && localSettings.provider !== 'ollama';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#09090b] border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surfaceHighlight/30 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Icon name="Settings" className="text-accent" />
              Engine Architecture
            </h2>
            <p className="text-sm text-textDim mt-1">Configure how IRIE processes and thinks about your data.</p>
          </div>
          <button onClick={onClose} className="text-textDim hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => applyPreset('offline')}
              className={`p-4 border rounded-xl text-left transition-all group ${localSettings.provider === 'ollama' && localSettings.embeddingProvider === 'local' ? 'bg-green-500/10 border-green-500/50' : 'bg-surfaceHighlight/50 border-white/5 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Shield" className={localSettings.provider === 'ollama' ? "text-green-400" : "text-textDim group-hover:text-green-400"} />
                <span className="font-bold text-sm text-white">Full Privacy Mode</span>
              </div>
              <p className="text-xs text-textDim leading-relaxed">
                100% Offline. Uses local embeddings and Ollama. No data leaves your device.
              </p>
            </button>

            <button 
              onClick={() => applyPreset('cloud')}
              className={`p-4 border rounded-xl text-left transition-all group ${localSettings.provider !== 'ollama' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-surfaceHighlight/50 border-white/5 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Zap" className={localSettings.provider !== 'ollama' ? "text-blue-400" : "text-textDim group-hover:text-blue-400"} />
                <span className="font-bold text-sm text-white">Cloud Performance</span>
              </div>
              <p className="text-xs text-textDim leading-relaxed">
                Uses powerful Cloud APIs (Gemini, OpenAI) for superior reasoning and context understanding.
              </p>
            </button>
          </div>

          <div className="h-px bg-white/5" />

          {/* SECTION 1: INDEXING (EMBEDDINGS) */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <span className="font-mono text-xs">1</span>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textDim">Knowledge Indexing Engine</h3>
             </div>
             
             <div className="grid grid-cols-3 gap-3">
                 {[
                   { id: 'local', label: 'Local (Offline)', icon: 'Cpu', desc: 'Free, Private, Browser-based' },
                   { id: 'gemini', label: 'Google Gemini', icon: 'Cloud', desc: 'High accuracy, Requires API Key' },
                   { id: 'openai', label: 'OpenAI', icon: 'Sparkles', desc: 'Industry Standard (text-embedding-3)' }
                 ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => handleChange('embeddingProvider', opt.id)}
                        className={`
                          flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all h-24
                          ${localSettings.embeddingProvider === opt.id 
                            ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                            : 'bg-surface border-transparent text-textDim hover:bg-white/5'}
                        `}
                    >
                        <div className="flex items-center gap-2 font-bold text-xs">
                           <Icon name={opt.icon as any} size={14}/> {opt.label}
                        </div>
                        <span className="text-[9px] opacity-60 text-center px-2">{opt.desc}</span>
                    </button>
                 ))}
             </div>
          </div>

          {/* SECTION 2: REASONING (LLM) */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center text-accent">
                    <span className="font-mono text-xs">2</span>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textDim">Reasoning Provider (LLM)</h3>
             </div>
             
             <div className="grid grid-cols-4 gap-2">
                {(['gemini', 'openai', 'openrouter', 'ollama'] as AIProvider[]).map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleChange('provider', provider)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all capitalize font-bold text-xs
                      ${localSettings.provider === provider 
                        ? 'bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-surface border-transparent text-textDim hover:bg-white/5'}
                    `}
                  >
                    {provider === 'openrouter' ? 'OpenRouter' : provider}
                  </button>
                ))}
             </div>
          </div>

          {/* Configuration Fields */}
          <div className="bg-surfaceHighlight/30 p-5 rounded-xl border border-white/5 space-y-4">
            
            {localSettings.provider === 'gemini' || localSettings.embeddingProvider === 'gemini' ? (
               <div className="space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-textDim flex justify-between">
                    <span>Gemini API Key</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-accent hover:underline">Get Key &rarr;</a>
                  </label>
                  <input 
                    type="password" 
                    value={localSettings.geminiKey}
                    onChange={(e) => handleChange('geminiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none font-mono"
                  />
               </div>
            ) : null}

            {localSettings.provider === 'openai' || localSettings.embeddingProvider === 'openai' ? (
               <div className="space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-textDim flex justify-between">
                     <span>OpenAI API Key</span>
                     <a href="https://platform.openai.com/api-keys" target="_blank" className="text-accent hover:underline">Get Key &rarr;</a>
                  </label>
                  <input 
                    type="password" 
                    value={localSettings.openaiKey}
                    onChange={(e) => handleChange('openaiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none font-mono"
                  />
               </div>
            ) : null}

            {localSettings.provider === 'openrouter' && (
               <div className="space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-textDim flex justify-between">
                     <span>OpenRouter API Key</span>
                     <a href="https://openrouter.ai/keys" target="_blank" className="text-accent hover:underline">Get Key &rarr;</a>
                  </label>
                  <input 
                    type="password" 
                    value={localSettings.openrouterKey || ''}
                    onChange={(e) => handleChange('openrouterKey', e.target.value)}
                    placeholder="sk-or-..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none font-mono"
                  />
                  <div className="flex gap-2 text-[10px] text-textDim mt-1">
                      <span>Popular Models:</span>
                      <span className="text-accent cursor-pointer hover:underline" onClick={() => handleChange('modelName', 'anthropic/claude-3-opus')}>Claude 3 Opus</span>
                      <span className="text-accent cursor-pointer hover:underline" onClick={() => handleChange('modelName', 'meta-llama/llama-3-70b-instruct')}>Llama 3 70B</span>
                      <span className="text-accent cursor-pointer hover:underline" onClick={() => handleChange('modelName', 'mistralai/mistral-large')}>Mistral Large</span>
                  </div>
               </div>
            )}

            {localSettings.provider === 'ollama' && (
               <div className="space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-textDim">Ollama URL</label>
                  <input 
                    type="text" 
                    value={localSettings.ollamaUrl}
                    onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent outline-none font-mono"
                  />
               </div>
            )}

            <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-textDim">Model Identifier</label>
                <input 
                    type="text" 
                    value={localSettings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder={localSettings.provider === 'gemini' ? "gemini-3-flash-preview" : "gpt-4o"}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-textDim focus:border-accent outline-none font-mono"
                />
            </div>
          </div>

          {/* PRIVACY ALERT */}
          {isPrivacyWarningNeeded && (
             <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Icon name="AlertTriangle" className="text-yellow-500 shrink-0" size={18} />
                <div>
                    <h4 className="text-xs font-bold text-yellow-500 uppercase mb-1">Privacy Notice</h4>
                    <p className="text-xs text-textDim leading-relaxed">
                        You are using <strong>Local Indexing</strong> but a <strong>Cloud LLM</strong> ({localSettings.provider}). 
                        Your documents remain on your device, but small text snippets (context) will be sent to the API to answer your questions.
                    </p>
                </div>
             </div>
          )}

          <div className="h-px bg-white/5" />
          
          {/* Danger Zone */}
          <div className="flex items-center justify-between p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                <div>
                    <h3 className="text-sm font-bold text-white">Factory Reset</h3>
                    <p className="text-[10px] text-textDim">Deletes all indexed files, messages, and settings.</p>
                </div>
                <button 
                    onClick={onPurgeData}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded text-xs font-bold transition-all"
                >
                    PURGE DATA
                </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-surfaceHighlight/30 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-textDim hover:text-white transition-colors">
            CANCEL
          </button>
          <button 
            onClick={() => { onSave(localSettings); onClose(); }}
            className="px-8 py-2.5 bg-white text-black text-xs font-bold rounded hover:bg-white/90 transition-colors shadow-lg shadow-white/10"
          >
            APPLY CONFIGURATION
          </button>
        </div>

      </div>
    </div>
  );
};
