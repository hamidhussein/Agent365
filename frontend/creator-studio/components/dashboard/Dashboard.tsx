import { useState } from 'react';
import { Bot, Pencil, Trash2, MessageSquare, FileText, Check, X, Rocket, LogOut, Plus, Zap, Share2, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Agent } from '../../types';
import { MODEL_OPTIONS } from '../../constants';
import { Breadcrumbs } from '../shared/Breadcrumbs';
import { StudioHeader } from '../shared/StudioHeader';
import CreateShareLinkModal from '../agent/CreateShareLinkModal';

export const Dashboard = ({
  agents,
  onCreateClick,
  onSelectAgent,
  onEditAgent,
  onDeleteAgent,
  onReviewsClick,
  onLogout,
}: {
  agents: Agent[],
  onCreateClick: () => void,
  onSelectAgent: (agent: Agent) => void,
  onEditAgent: (agent: Agent) => void,
  onDeleteAgent: (id: string) => void,
  onReviewsClick?: () => void,
  onLogout?: () => void,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareAgentId, setShareAgentId] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Premium Gradient Background Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 pointer-events-none" />
      
      <StudioHeader 
        left={
          <Breadcrumbs view="dashboard" onNavigate={() => {}} className="py-0" />
        }
        right={
          <div className="flex items-center gap-3">
            {onLogout && (
              <Button onClick={onLogout} variant="outline" className="px-4 shadow-sm border-border bg-card/60 hover:bg-muted font-bold text-muted-foreground hover:text-foreground">
                <LogOut size={16} className="mr-2" /> Logout
              </Button>
            )}
            {onReviewsClick && (
              <Button onClick={onReviewsClick} variant="outline" className="px-4 shadow-sm border-border bg-card/60 hover:bg-muted font-bold text-muted-foreground hover:text-foreground">
                <MessageSquare size={16} className="mr-2" /> Reviews
              </Button>
            )}
            <Button className="px-5 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold active:scale-[0.97] transition-all" onClick={onCreateClick}>
              <Plus size={16} className="mr-2" /> Create New Agent
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 relative z-10">
        
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Your Agents</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage and deploy your intelligent AI workforce.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MessageSquare size={48} className="text-primary" />
            </div>
            <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase mb-2">Total Interactions</div>
            <div className="text-4xl font-black text-foreground tracking-tight">1,234</div>
            <div className="text-xs font-medium text-emerald-500 mt-2 flex items-center gap-1">+12% from last week</div>
          </div>
          
          <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Bot size={48} className="text-primary" />
            </div>
            <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase mb-2">Active Agents</div>
            <div className="text-4xl font-black text-primary tracking-tight drop-shadow-sm">{agents.length}</div>
            <div className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1">Deployed and operational</div>
          </div>
          
          <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={48} className="text-emerald-500" />
            </div>
            <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase mb-2">Avg. Response Time</div>
            <div className="text-4xl font-black text-emerald-500 tracking-tight drop-shadow-sm">1.2s</div>
            <div className="text-xs font-medium text-emerald-500 mt-2 flex items-center gap-1">Lightning fast</div>
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
                <Rocket size={32} className="mr-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> Create First Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
              const isDeleting = deleteId === agent.id;
              return (
                <div key={agent.id} className="group bg-card/60 backdrop-blur-md border border-border/60 hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_-12px_var(--primary)] hover:-translate-y-1 flex flex-col relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="p-6 flex-1 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${agent.color || 'bg-blue-500'} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
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
                                setShareAgentId(agent.id);
                              }}
                              className="p-1.5 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary"
                              aria-label={`Share ${agent.name}`}
                              title="Share agent"
                            >
                              <Share2 size={16} />
                            </button>
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

                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary">
                        {opt?.label || 'Unknown Model'}
                      </span>
                      {agent.files.length > 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <FileText size={10} /> {agent.files.length} Files
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-border/50 bg-muted/20 relative z-10">
                    <Button 
                      className="w-full bg-primary hover:bg-primary text-primary-foreground font-bold shadow-sm transition-all duration-300 group-hover:shadow-md border-0" 
                      onClick={() => onSelectAgent(agent)}
                    >
                      <Settings size={16} className="mr-2" /> Manage Agent
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quick Share Modal — triggered from agent card */}
      {shareAgentId && (
        <CreateShareLinkModal
          agentId={shareAgentId}
          onClose={() => setShareAgentId(null)}
          onSuccess={() => setShareAgentId(null)}
        />
      )}
    </div>
  );
};

