import { useState } from 'react';
import { Bot, Pencil, Trash2, MessageSquare, FileText, Check, X, Rocket } from 'lucide-react';
import { Button } from '../ui/Button';
import { Agent } from '../../types';
import { MODEL_OPTIONS } from '../../constants';

export const Dashboard = ({
  agents,
  onCreateClick,
  onSelectAgent,
  onEditAgent,
  onDeleteAgent,
  onReviewsClick,
}: {
  agents: Agent[],
  onCreateClick: () => void,
  onSelectAgent: (agent: Agent) => void,
  onEditAgent: (agent: Agent) => void,
  onDeleteAgent: (id: string) => void,
  onReviewsClick?: () => void,
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
            <h1 className="text-2xl font-bold text-foreground">Your Agents</h1>
            <p className="text-muted-foreground mt-1">Manage and deploy your AI workforce.</p>
          </div>
          <div className="flex gap-3">
            {onReviewsClick && (
              <Button onClick={onReviewsClick} variant="outline" className="px-5">
                <MessageSquare size={18} /> Reviews
              </Button>
            )}
            <Button className="px-6 py-2.5 shadow-xl" onClick={onCreateClick}>
              <Rocket size={18} className="mr-2" /> Publish New Agent
            </Button>
          </div>
        </div>

        {/* Stats Grid (Mock) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card/50 border border-border p-5 rounded-xl backdrop-blur-sm">
            <div className="text-muted-foreground text-sm font-medium mb-1">Total Interactions</div>
            <div className="text-2xl font-bold text-foreground">1,234</div>
          </div>
          <div className="bg-card/50 border border-border p-5 rounded-xl backdrop-blur-sm">
            <div className="text-muted-foreground text-sm font-medium mb-1">Active Agents</div>
            <div className="text-2xl font-bold text-primary">{agents.length}</div>
          </div>
          <div className="bg-card/50 border border-border p-5 rounded-xl backdrop-blur-sm">
            <div className="text-muted-foreground text-sm font-medium mb-1">Avg. Response Time</div>
            <div className="text-2xl font-bold text-emerald-500">1.2s</div>
          </div>
        </div>

        {/* Agent Grid */}
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-border rounded-3xl bg-muted/10 backdrop-blur-sm px-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                  <Bot size={32} className="text-primary" />
               </div>
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3">No agents created yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-10 text-lg font-medium">
              Start building your AI workforce by clicking the button below. Let's create something amazing!
            </p>
            <Button 
                className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground border-0 font-black px-12 py-8 text-2xl hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 shadow-xl shadow-primary/20 rounded-2xl group transition-all duration-300" 
                onClick={onCreateClick}
            >
                <Rocket size={32} className="mr-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> Publish First Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
              const isDeleting = deleteId === agent.id;
              return (
                <div key={agent.id} className="group bg-card border border-border hover:border-primary/50 rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/10 flex flex-col">
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
                              className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
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
                              className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                              aria-label={`Edit ${agent.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(agent.id);
                              }}
                              className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                              aria-label={`Delete ${agent.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2 truncate">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{agent.description}</p>

                    <div className="flex flex-wrap gap-2 mt-auto">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-secondary rounded border border-border text-muted-foreground">
                        {opt?.label || 'Unknown Model'}
                      </span>
                      {agent.files.length > 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-secondary rounded border border-border text-muted-foreground flex items-center gap-1">
                          <FileText size={10} /> {agent.files.length} Files
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-border bg-card/50">
                    <Button className="w-full" onClick={() => onSelectAgent(agent)}>
                      <MessageSquare size={16} /> Hire Agent
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


