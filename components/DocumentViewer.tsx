import React, { useEffect, useRef } from 'react';
import { UploadedFile } from '../types';
import { Icon } from './Icon';

interface DocumentViewerProps {
  file: UploadedFile;
  highlightText?: string;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, highlightText, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlight
  useEffect(() => {
    if (highlightText && contentRef.current) {
      // Small timeout to ensure rendering is done
      setTimeout(() => {
        const mark = contentRef.current?.querySelector('mark');
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightText, file.id]);

  // Helper to render text with highlight
  const renderContent = () => {
    if (!highlightText) return <div className="whitespace-pre-wrap font-mono text-sm text-textDim">{file.content}</div>;

    // Split content by the highlight text
    // Note: This is a simple exact match. A more robust solution would use fuzzy matching.
    const parts = file.content.split(highlightText);
    
    // If not found (due to formatting diffs), just return text
    if (parts.length === 1) return <div className="whitespace-pre-wrap font-mono text-sm text-textDim">{file.content}</div>;

    return (
      <div className="whitespace-pre-wrap font-mono text-sm text-textDim">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <mark className="bg-yellow-500/20 text-yellow-200 border-b border-yellow-500/50 rounded-sm px-0.5 animate-pulse">
                {highlightText}
              </mark>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute top-0 right-0 h-full w-[500px] bg-surface border-l border-border shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-surfaceHighlight/20 backdrop-blur">
        <div className="flex items-center gap-3">
           <Icon name="FileText" size={16} className="text-accent" />
           <div>
             <h3 className="text-sm font-bold text-text truncate max-w-[250px]">{file.name}</h3>
             <p className="text-[10px] text-textDim uppercase">Read Mode</p>
           </div>
        </div>
        <button onClick={onClose} className="text-textDim hover:text-white transition-colors">
          <Icon name="X" size={20} />
        </button>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-8 bg-[#09090b]">
        <div className="max-w-full">
            {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-surface text-[10px] text-textDim flex justify-between">
         <span>{file.chunks.length} vectorized chunks</span>
         <span>{(file.size / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );
};