import { Bot, RefreshCcw, Sparkles, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Agent } from '../../types';
import { MODEL_OPTIONS } from '../../constants';

export const Marketplace = ({
  agents,
  onSelectAgent,
  onRefresh,
  onBack
}: {
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
  onRefresh: () => void;
  onBack: () => void;
}) => {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Agent Marketplace</div>
              <div className="text-xs text-muted-foreground">Public agents you can run instantly.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-xs border-border text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onRefresh}>
              <RefreshCcw size={14} /> Refresh
            </Button>
            <Button variant="outline" className="text-xs border-border" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {agents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-muted/30">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No public agents yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Creators haven’t published any agents. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
              return (
                <div key={agent.id} className="group bg-card border border-border hover:border-primary/50 rounded-xl overflow-hidden transition-all hover:shadow-lg flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${agent.color || 'bg-muted'} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                        {opt?.icon || <Bot size={24} />}
                      </div>
                      <div className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-1 rounded-full font-medium">
                        {agent.creditsPerRun} credits/run
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 truncate">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">{agent.description}</p>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-secondary rounded border border-border text-muted-foreground">
                        {opt?.label || 'Unknown Model'}
                      </span>
                      {(agent as any).actions && (agent as any).actions.length > 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-purple-50 rounded border border-purple-100 text-purple-600 flex items-center gap-1">
                          <Zap size={10} /> {(agent as any).actions.length} Actions
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border-t border-border bg-secondary/30">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20" onClick={() => onSelectAgent(agent)}>
                      Try Agent
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

