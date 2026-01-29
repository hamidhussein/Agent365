import React from 'react';
import { Agent } from '../types';
import { CreditIcon, HeartIcon, StarIcon, ZapIcon } from './icons/Icons';

interface AgentListProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({
  agents,
  onSelectAgent,
  onSelectCreator,
  favoriteAgentIds,
  onToggleFavorite,
}) => {
  const handleCreatorClick = (e: React.MouseEvent, username?: string) => {
    e.stopPropagation();
    if (username) onSelectCreator(username);
  };

  const handleFavoriteClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    onToggleFavorite(agentId);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm">
      <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.6fr)] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/40 border-b border-border">
        <span>Agent</span>
        <span>Creator</span>
        <span>Stats</span>
        <span className="text-right">Price</span>
      </div>
      <div className="divide-y divide-border/60">
        {agents.map((agent) => {
          const isFavorited = favoriteAgentIds.has(agent.id);
          const isCreatorStudio = agent.source === 'creator_studio';

          return (
            <div
              key={agent.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectAgent(agent.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAgent(agent.id);
                }
              }}
              className="grid grid-cols-1 gap-4 px-4 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.6fr)] md:items-center md:px-5"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-12 w-16 overflow-hidden rounded-xl border border-border/60 bg-muted shrink-0">
                  <img src={agent.imageUrl} alt={agent.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isCreatorStudio && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20">
                        Studio
                      </span>
                    )}
                    {agent.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <img
                  src={agent.creator.avatar_url || ''}
                  alt={agent.creator.full_name || agent.creator.username}
                  className="h-6 w-6 rounded-full border border-white/50 object-cover"
                />
                <button
                  onClick={(e) => handleCreatorClick(e, agent.creator.username)}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {agent.creator.full_name || agent.creator.username}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center text-yellow-500">
                  <StarIcon className="h-4 w-4 shrink-0" />
                  <span className="ml-1 font-semibold text-foreground">{agent.rating}</span>
                  <span className="ml-1 text-muted-foreground">({agent.reviewCount})</span>
                </div>
                <div className="flex items-center text-muted-foreground" title={`${agent.runs.toLocaleString()} runs`}>
                  <ZapIcon className="h-4 w-4 shrink-0" />
                  <span className="ml-1 text-foreground">{agent.runs.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  <CreditIcon className="mr-1 h-3 w-3" />
                  {agent.price} / run
                </span>
                <button
                  onClick={(e) => handleFavoriteClick(e, agent.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 transition-colors ${isFavorited ? 'text-rose-500 bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white'}`}
                  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <HeartIcon className={`h-4 w-4 ${isFavorited ? 'fill-current' : 'fill-none'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentList;
