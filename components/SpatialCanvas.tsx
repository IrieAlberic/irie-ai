import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile, Message } from '../types';
import { Icon } from './Icon';

interface SpatialCanvasProps {
  files: UploadedFile[];
  messages: Message[];
  onSummarize: (fileId: string) => void;
  onNodeMove?: (id: string, x: number, y: number, type: 'file' | 'message') => void;
  onDeleteNode?: (id: string, type: 'file' | 'message') => void;
}

interface Node {
  id: string;
  type: 'file' | 'message';
  title: string;
  content: string;
  x: number;
  y: number;
  relatedIds?: string[]; 
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null; // Null if clicking canvas background
  visible: boolean;
}

interface TransformState {
  x: number;
  y: number;
  scale: number;
}

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({ files, messages, onSummarize, onNodeMove, onDeleteNode }) => {
  // State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [manualLinks, setManualLinks] = useState<[string, string][]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  
  // Interaction State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, nodeId: null, visible: false });
  
  // Refs for drag math
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // Initialize nodes (Respecting persisted X/Y if available)
  useEffect(() => {
    const width = canvasRef.current?.clientWidth || 1000;
    const height = canvasRef.current?.clientHeight || 800;

    setNodes(prevNodes => {
        const existingMap = new Map(prevNodes.map(n => [n.id, n]));
        
        const fileNodes: Node[] = files.map((file, i) => {
            // Priority: 1. Existing Node State (Drag in progress) 2. Persisted DB coord 3. New Calculated coord
            if (existingMap.has(file.id)) return existingMap.get(file.id)!;
            
            const angle = (i / (files.length || 1)) * 2 * Math.PI;
            const radius = 300;
            const defaultX = (width / 2) + Math.cos(angle) * radius - 100;
            const defaultY = (height / 2) + Math.sin(angle) * radius - 60;

            return {
                id: file.id,
                type: 'file',
                title: file.name,
                content: file.content,
                x: file.x ?? defaultX, // Use persisted X if exists
                y: file.y ?? defaultY, // Use persisted Y if exists
                relatedIds: []
            };
        });

        const msgNodes: Node[] = messages
        .filter(m => m.role !== 'system')
        .map((msg, i) => {
            if (existingMap.has(msg.id)) return existingMap.get(msg.id)!;
            
            const isModel = msg.role === 'model';
            const related = msg.citations?.map(c => {
                const f = files.find(f => f.chunks.some(chunk => chunk.id === c.id));
                return f ? f.id : null;
            }).filter(Boolean) as string[] || [];

            const defaultX = (width / 2) - 150 + (i * 20);
            const defaultY = (height / 2) - 100 + (i * 60);

            return {
                id: msg.id,
                type: 'message',
                title: isModel ? 'IRIE RESPONSE' : 'QUERY',
                content: msg.content,
                x: msg.x ?? defaultX, // Use persisted X
                y: msg.y ?? defaultY, // Use persisted Y
                relatedIds: related
            };
        });

        return [...fileNodes, ...msgNodes];
    });
  }, [files, messages]);

  // --- Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, transform.scale + delta), 3);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingId) {
        setIsPanning(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (e.shiftKey) {
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    } else {
        if (!selectedNodeIds.has(id)) {
            setSelectedNodeIds(new Set([id]));
        }
    }

    if (e.button === 0) {
        setDraggingId(id);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (draggingId) {
        const dx = (e.clientX - dragStartRef.current.x) / transform.scale;
        const dy = (e.clientY - dragStartRef.current.y) / transform.scale;
        
        setNodes(prev => prev.map(n => {
            if (n.id === draggingId || (selectedNodeIds.has(n.id) && selectedNodeIds.has(draggingId))) {
                return { ...n, x: n.x + dx, y: n.y + dy };
            }
            return n;
        }));
        
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    // If we were dragging a node, now is the time to save its position to DB
    if (draggingId && onNodeMove) {
        const node = nodes.find(n => n.id === draggingId);
        if (node) {
            onNodeMove(node.id, node.x, node.y, node.type);
        }
        // Also save multi-selected nodes if they moved
        if (selectedNodeIds.has(draggingId)) {
            selectedNodeIds.forEach(id => {
                if (id !== draggingId) {
                    const n = nodes.find(node => node.id === id);
                    if (n) onNodeMove(n.id, n.x, n.y, n.type);
                }
            });
        }
    }

    setIsPanning(false);
    setDraggingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeId && !selectedNodeIds.has(nodeId)) {
        setSelectedNodeIds(new Set([nodeId]));
    }
    setContextMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId: nodeId,
        visible: true
    });
  };

  // --- Actions ---

  const handleSummarizeAction = () => {
    if (contextMenu.nodeId) {
        onSummarize(contextMenu.nodeId);
        setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleDeleteAction = () => {
    if (contextMenu.nodeId && onDeleteNode) {
        const node = nodes.find(n => n.id === contextMenu.nodeId);
        if (node) onDeleteNode(node.id, node.type);
        setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleLinkAction = () => {
      const ids = Array.from(selectedNodeIds) as string[];
      if (ids.length < 2) return;
      const newLinks: [string, string][] = [];
      for (let i = 0; i < ids.length - 1; i++) {
          newLinks.push([ids[i], ids[i+1]]);
      }
      setManualLinks(prev => [...prev, ...newLinks]);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div 
        ref={canvasRef}
        className="w-full h-full bg-[#050505] relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => handleContextMenu(e, null)}
    >
        {/* Infinite Grid Background */}
        <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
                backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', 
                backgroundSize: `${30 * transform.scale}px ${30 * transform.scale}px`,
                backgroundPosition: `${transform.x}px ${transform.y}px`,
                opacity: 0.3
            }}
        />

        {/* Transform Container */}
        <div 
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%'
            }}
        >
            {/* SVG Connections Layer */}
            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
                {nodes.map(node => {
                    if (!node.relatedIds) return null;
                    return node.relatedIds.map(targetId => {
                        const target = nodes.find(n => n.id === targetId);
                        if (!target) return null;
                        return (
                            <line 
                                key={`${node.id}-${target.id}`}
                                x1={node.x + 100} y1={node.y + 40}
                                x2={target.x + 100} y2={target.y + 40}
                                stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5"
                            />
                        );
                    });
                })}
                {manualLinks.map(([srcId, tgtId], i) => {
                    const src = nodes.find(n => n.id === srcId);
                    const tgt = nodes.find(n => n.id === tgtId);
                    if (!src || !tgt) return null;
                    return (
                        <line 
                            key={`manual-${i}`}
                            x1={src.x + 100} y1={src.y + 40}
                            x2={tgt.x + 100} y2={tgt.y + 40}
                            stroke="#10b981" strokeWidth="2" strokeOpacity="0.6"
                        />
                    );
                })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
                const isSelected = selectedNodeIds.has(node.id);
                return (
                    <div 
                        key={node.id}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        onContextMenu={(e) => handleContextMenu(e, node.id)}
                        className={`
                            absolute p-3 rounded-lg w-56 shadow-2xl backdrop-blur-md border transition-shadow cursor-pointer
                            ${node.type === 'file' ? 'bg-surface/80 border-white/10' : 'bg-surfaceHighlight/90 border-accent/20'}
                            ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-black z-40' : 'z-10'}
                        `}
                        style={{
                            transform: `translate(${node.x}px, ${node.y}px)`,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2 pointer-events-none">
                            <Icon 
                                name={node.type === 'file' ? 'FileText' : 'MessageSquare'} 
                                size={12} 
                                className={node.type === 'file' ? 'text-textDim' : 'text-accent'} 
                            />
                            <span className="text-xs font-mono font-bold truncate text-text">{node.title}</span>
                        </div>
                        <div className="text-[10px] text-textDim line-clamp-4 font-mono leading-relaxed pointer-events-none">
                            {node.content}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* UI Overlay */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
             <div className="bg-surfaceHighlight/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-lg">
                <Icon name="MousePointer2" size={14} className="text-accent" />
                <span className="text-xs font-mono text-textDim">Right-click nodes for actions • Shift+Click to Select</span>
             </div>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
            <div 
                className="fixed z-50 bg-surface border border-white/10 rounded-lg shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onMouseLeave={() => setContextMenu(prev => ({...prev, visible: false}))}
            >
                {contextMenu.nodeId ? (
                    <>
                        <button 
                            onClick={handleSummarizeAction}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex items-center gap-2"
                        >
                            <Icon name="Zap" size={12} className="text-yellow-400" />
                            Summarize with AI
                        </button>
                        <button 
                             onClick={handleLinkAction}
                             disabled={selectedNodeIds.size < 2}
                             className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Icon name="Link" size={12} className="text-green-400" />
                            Link Selected ({selectedNodeIds.size})
                        </button>
                        <div className="my-1 border-t border-white/5"></div>
                        <button 
                            onClick={handleDeleteAction}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/20 text-textDim hover:text-red-400 flex items-center gap-2"
                        >
                            <Icon name="Trash2" size={12} />
                            Delete Node
                        </button>
                    </>
                ) : (
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex items-center gap-2">
                        <Icon name="Plus" size={12} />
                        Add Note
                    </button>
                )}
            </div>
        )}
    </div>
  );
};