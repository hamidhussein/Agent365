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
    <div className="min-h-screen">
      <header className="bg-slate-900/60 backdrop-blur border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Agent Marketplace</div>
              <div className="text-xs text-slate-400">Public agents you can run instantly.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-xs" onClick={onRefresh}>
              <RefreshCcw size={14} /> Refresh
            </Button>
            <Button variant="secondary" className="text-xs" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {agents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No public agents yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Creators havent published any agents. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
              return (
                <div key={agent.id} className="group bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-emerald-900/10 flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${agent.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        {opt?.icon || <Bot size={24} />}
                      </div>
                      <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-700 px-2 py-1 rounded-full">
                        {agent.creditsPerRun} credits/run
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 truncate">{agent.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-4 min-h-[60px]">{agent.description}</p>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-900 rounded border border-slate-700 text-slate-400">
                        {opt?.label || 'Unknown Model'}
                      </span>
                      {(agent as any).actions && (agent as any).actions.length > 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-purple-900/40 rounded border border-purple-700 text-purple-300 flex items-center gap-1">
                          <Zap size={10} /> {(agent as any).actions.length} Actions
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <Button className="w-full" onClick={() => onSelectAgent(agent)}>
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

