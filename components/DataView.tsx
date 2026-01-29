import React from 'react';
import { ExtractedEntity } from '../types';
import { Icon } from './Icon';

interface DataViewProps {
  data: ExtractedEntity[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DataView: React.FC<DataViewProps> = ({ data, isLoading, onRefresh }) => {
  return (
    <div className="flex flex-col h-full bg-[#09090b] text-text relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50 backdrop-blur">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Icon name="Database" className="text-accent" />
            Structured Intelligence
          </h2>
          <p className="text-xs text-textDim mt-1">Automatic entity extraction from indexed documents.</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-surfaceHighlight hover:bg-white/10 rounded text-xs font-mono transition-colors disabled:opacity-50"
        >
          <Icon name="RefreshCw" size={14} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "EXTRACTING..." : "RUN EXTRACTION"}
        </button>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-6">
        {data.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-textDim opacity-50 border border-dashed border-white/10 rounded-xl">
                <Icon name="Table" size={48} className="mb-4" />
                <p>No data extracted yet. Click "Run Extraction".</p>
            </div>
        ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surfaceHighlight text-xs uppercase font-mono text-textDim">
                        <tr>
                            <th className="px-4 py-3 border-b border-border font-medium">Type</th>
                            <th className="px-4 py-3 border-b border-border font-medium">Entity Name</th>
                            <th className="px-4 py-3 border-b border-border font-medium">Description</th>
                            <th className="px-4 py-3 border-b border-border font-medium">Inferred Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">
                                    <span className={`
                                        px-2 py-1 rounded text-[10px] uppercase
                                        ${row.type === 'person' ? 'bg-blue-500/20 text-blue-400' : ''}
                                        ${row.type === 'concept' ? 'bg-purple-500/20 text-purple-400' : ''}
                                        ${row.type === 'location' ? 'bg-green-500/20 text-green-400' : ''}
                                        ${row.type === 'metric' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                                        ${row.type === 'date' ? 'bg-orange-500/20 text-orange-400' : ''}
                                    `}>
                                        {row.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                                <td className="px-4 py-3 text-textDim">{row.description}</td>
                                <td className="px-4 py-3 text-xs font-mono text-textDim/70">{row.sourceDoc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};