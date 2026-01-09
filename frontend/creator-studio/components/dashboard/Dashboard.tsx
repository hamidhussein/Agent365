import { useState } from 'react';
import { Bot, Plus, Pencil, Trash2, MessageSquare, FileText, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Agent } from '../../types';
import { MODEL_OPTIONS } from '../../constants';

export const Dashboard = ({
  agents,
  onCreateClick,
  onSelectAgent,
  onEditAgent,
  onDeleteAgent,
}: {
  agents: Agent[],
  onCreateClick: () => void,
  onSelectAgent: (agent: Agent) => void,
  onEditAgent: (agent: Agent) => void,
  onDeleteAgent: (id: string) => void,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Internal Header Removed - Using Global App Header */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Agents</h1>
            <p className="text-slate-400 mt-1">Manage and deploy your AI workforce.</p>
          </div>
          <Button onClick={onCreateClick}>
            <Plus size={18} /> Create New Agent
          </Button>
        </div>

        {/* Stats Grid (Mock) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl">
            <div className="text-slate-400 text-sm font-medium mb-1">Total Interactions</div>
            <div className="text-2xl font-bold text-white">1,234</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl">
            <div className="text-slate-400 text-sm font-medium mb-1">Active Agents</div>
            <div className="text-2xl font-bold text-blue-400">{agents.length}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl">
            <div className="text-slate-400 text-sm font-medium mb-1">Avg. Response Time</div>
            <div className="text-2xl font-bold text-emerald-400">1.2s</div>
          </div>
        </div>

        {/* Agent Grid */}
        {agents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No agents created yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">Start building your AI assistant by clicking the create button above.</p>
            <Button onClick={onCreateClick}>Create First Agent</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
              const isDeleting = deleteId === agent.id;
              return (
                <div key={agent.id} className="group bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-900/10 flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${agent.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        {opt?.icon || <Bot size={24} />}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isDeleting ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAgent(agent.id);
                                setDeleteId(null);
                              }}
                              className="p-1.5 hover:bg-emerald-900/30 rounded text-slate-400 hover:text-emerald-400"
                              aria-label={`Confirm delete ${agent.name}`}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(null);
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                              aria-label={`Cancel delete ${agent.name}`}
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAgent(agent);
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                              aria-label={`Edit ${agent.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(agent.id);
                              }}
                              className="p-1.5 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400"
                              aria-label={`Delete ${agent.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 truncate">{agent.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">{agent.description}</p>

                    <div className="flex flex-wrap gap-2 mt-auto">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-900 rounded border border-slate-700 text-slate-400">
                        {opt?.label || 'Unknown Model'}
                      </span>
                      {agent.files.length > 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-900 rounded border border-slate-700 text-slate-400 flex items-center gap-1">
                          <FileText size={10} /> {agent.files.length} Files
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <Button className="w-full" onClick={() => onSelectAgent(agent)}>
                      <MessageSquare size={16} /> Chat Now
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};


