
import React, { useState, useRef, useEffect } from 'react';
import { Agent } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon, MoreVerticalIcon, EyeIcon } from '../icons/Icons';
import { Page } from '../../App';

interface MyAgentsListProps {
  agents: Agent[];
  onNavigate: (page: Page) => void;
  onSelectAgent: (agentId: string) => void;
  showHeader?: boolean;
}

const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border';
  const statusClasses = {
    Live: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    Draft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    Paused: 'bg-muted text-muted-foreground border-border',
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


const MyAgentsList: React.FC<MyAgentsListProps> = ({ agents, onNavigate, onSelectAgent, showHeader = true }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card/80 shadow-sm">
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">My Agents</h2>
          <button
            onClick={() => onNavigate('createAgent')}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Create New Agent
          </button>
        </div>
      )}
      <div className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.4fr)] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/40 border-b border-border">
          <span>Agent</span>
          <span>Status</span>
          <span>Runs</span>
          <span>Rating</span>
          <span>Price</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border/60">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="grid grid-cols-1 gap-4 px-4 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.4fr)] md:items-center md:px-5"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                  <img className="h-full w-full object-cover" src={agent.imageUrl} alt={agent.name} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{agent.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{agent.id}</div>
                </div>
              </div>
              <div className="text-sm text-foreground">
                <StatusBadge status={agent.status} />
              </div>
              <div className="text-sm text-foreground">{agent.runs.toLocaleString()}</div>
              <div className="text-sm text-foreground">{agent.rating} ({agent.reviewCount})</div>
              <div className="text-sm text-foreground">{agent.price} credits</div>
              <div className="relative text-right">
                <button onClick={() => setOpenMenuId(openMenuId === agent.id ? null : agent.id)} className="text-muted-foreground hover:text-foreground">
                  <MoreVerticalIcon className="h-5 w-5" />
                  <span className="sr-only">Actions for {agent.name}</span>
                </button>
                {openMenuId === agent.id && (
                  <div ref={menuRef} className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-border">
                    <div className="py-1">
                      <button onClick={() => { onSelectAgent(agent.id); setOpenMenuId(null); }} className="flex items-center w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary hover:text-primary">
                        <EyeIcon className="h-4 w-4 mr-3" /> View
                      </button>
                      <button className="flex items-center w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary hover:text-primary">
                        <PencilIcon className="h-4 w-4 mr-3" /> Edit
                      </button>
                      <button className="flex items-center w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                        <TrashIcon className="h-4 w-4 mr-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyAgentsList;
