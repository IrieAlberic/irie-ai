import React, { useState } from 'react';
import { UploadedFile, AppView } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  files: UploadedFile[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ files, onUpload, currentView, onViewChange, onOpenSettings }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const totalChunks = files.reduce((acc, f) => acc + f.chunks.length, 0);

  return (
    <aside 
      className={`
        bg-surface border-r border-border flex flex-col h-full z-20 shrink-0 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[70px]' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className={`p-4 border-b border-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] shrink-0">
                <div className="w-4 h-4 bg-black rounded-sm" />
            </div>
            {!isCollapsed && (
                <div className="animate-in fade-in duration-300">
                    <h1 className="font-bold text-sm tracking-widest text-primary">IRIE</h1>
                    <p className="text-[10px] text-textDim uppercase tracking-wider">OS</p>
                </div>
            )}
        </div>
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-textDim hover:text-white transition-colors ${isCollapsed ? 'hidden' : 'block'}`}
        >
            <Icon name="ChevronLeft" size={16} />
        </button>
      </div>
      
      {/* Toggle Button for Collapsed State (Centered below logo) */}
      {isCollapsed && (
         <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mx-auto mt-2 text-textDim hover:text-white"
        >
            <Icon name="ChevronRight" size={16} />
        </button>
      )}

      {/* Navigation */}
      <nav className="p-2 space-y-1 mt-4">
        {[
            { id: 'chat', icon: 'MessageSquare', label: 'Intelligence' },
            { id: 'spatial', icon: 'LayoutDashboard', label: 'Spatial Canvas' },
            { id: 'data', icon: 'Database', label: 'Data Sources' },
            { id: 'podcast', icon: 'Headphones', label: 'Podcast Mode' }
        ].map((item) => (
            <button 
                key={item.id}
                onClick={() => onViewChange(item.id as AppView)}
                className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group
                    ${currentView === item.id ? 'bg-surfaceHighlight text-primary' : 'text-textDim hover:text-primary'}
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : ''}
            >
                <Icon name={item.icon as any} size={20} />
                {!isCollapsed && <span>{item.label}</span>}
                
                {item.id === 'podcast' && !isCollapsed && (
                     <span className="absolute right-2 top-2 w-1.5 h-1.5 bg-accent rounded-full opacity-50"></span>
                )}
            </button>
        ))}
      </nav>

      {/* Files Section */}
      <div className="flex-1 mt-6 px-4 overflow-y-auto">
        {!isCollapsed ? (
            <>
                <div className="flex items-center justify-between mb-2 animate-in fade-in duration-300">
                    <h3 className="text-xs font-semibold text-textDim uppercase">Indexed Memory</h3>
                    <span className="text-[10px] bg-surfaceHighlight px-1.5 py-0.5 rounded text-textDim">{totalChunks} chunks</span>
                </div>
                
                <div className="space-y-2 animate-in fade-in duration-300">
                {files.map(file => (
                    <div key={file.id} className="group flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Icon name="FileText" size={14} className="text-textDim" />
                        <span className="text-sm text-text truncate w-32">{file.name}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${file.status === 'ready' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
                    </div>
                ))}

                {files.length === 0 && (
                    <div className="text-xs text-textDim italic py-4 text-center border border-dashed border-white/10 rounded-lg">
                    No context loaded.
                    </div>
                )}
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center gap-4 py-4 border-t border-white/5">
                 <div className="relative group" title={`${totalChunks} chunks indexed`}>
                     <Icon name="HardDrive" size={18} className="text-textDim" />
                     {files.length > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>}
                 </div>
            </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="p-4 border-t border-border">
        <label className={`
            flex flex-col items-center justify-center w-full border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-surfaceHighlight transition-colors group
            ${isCollapsed ? 'h-12 border-transparent hover:border-white/20' : 'h-24'}
        `}>
            {isCollapsed ? (
                <Icon name="UploadCloud" size={20} className="text-textDim group-hover:text-primary" />
            ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 animate-in fade-in">
                    <Icon name="UploadCloud" className="text-textDim group-hover:text-primary mb-2" />
                    <p className="text-xs text-textDim">PDF, TXT, MD, CSV</p>
                </div>
            )}
            <input type="file" className="hidden" multiple onChange={onUpload} accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.tsx" />
        </label>
      </div>

      {/* Footer / Settings */}
      <div className={`p-4 border-t border-border bg-black/20 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button 
          onClick={onOpenSettings}
          className={`
            flex items-center gap-2 text-textDim hover:text-white transition-colors text-xs font-mono mb-2
            ${isCollapsed ? 'justify-center w-full' : 'w-full'}
          `}
          title={isCollapsed ? "Configure Engine" : ""}
        >
          <Icon name="Settings" size={isCollapsed ? 18 : 12} />
          {!isCollapsed && <span>Configure Engine</span>}
        </button>
        
        {!isCollapsed && (
            <div className="flex items-center gap-2 text-[10px] text-textDim animate-in fade-in">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>IRIE System Active</span>
            </div>
        )}
      </div>
    </aside>
  );
};