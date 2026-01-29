
import React from 'react';
import { Agent } from '../types';
import { StarIcon, ZapIcon, CreditIcon, HeartIcon } from './icons/Icons';

interface AgentCardProps {
    agent: Agent;
    onSelect: (agentId: string) => void;
    onSelectCreator: (username: string) => void;
    isFavorited: boolean;
    onToggleFavorite: (agentId: string) => void;
    showFavorite?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, onSelectCreator, isFavorited, onToggleFavorite, showFavorite = true }) => {

    const isCreatorStudio = agent.source === "creator_studio";

    const handleCreatorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectCreator(agent.creator.username || '');
    }

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite(agent.id);
    }

    return (
        <div onClick={() => onSelect(agent.id)} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
            <div className="relative">
                <img src={agent.imageUrl} alt={agent.name} className="h-36 w-full object-cover sm:h-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent dark:from-black/60 dark:via-black/20" />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                    {isCreatorStudio && (
                        <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-sm">
                            Studio
                        </span>
                    )}
                </div>
                {showFavorite && (
                    <button
                        onClick={handleFavoriteClick}
                        className={`absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-colors duration-200 border border-white/20 ${isFavorited ? 'text-rose-500 bg-white shadow-sm' : 'text-foreground/70 hover:text-foreground hover:bg-white'} `}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <HeartIcon className={`h-5 w-5 ${isFavorited ? 'fill-current' : 'fill-none'}`} />
                    </button>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {agent.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                            {tag}
                        </span>
                    ))}
                </div>
                <h3 className="mt-2 text-base font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {agent.name}
                </h3>
                <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                    <img src={agent.creator.avatar_url || ''} alt={agent.creator.full_name || agent.creator.username} className="h-4 w-4 rounded-full border border-white/50" />
                    <span>
                        by{' '}
                        <button onClick={handleCreatorClick} className="font-medium text-foreground hover:text-primary hover:underline z-10 relative">
                            {agent.creator.full_name || agent.creator.username}
                        </button>
                    </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center text-yellow-500">
                        <StarIcon className="h-4 w-4" />
                        <span className="ml-1 font-semibold text-foreground">{agent.rating}</span>
                        <span className="ml-1 text-muted-foreground">({agent.reviewCount})</span>
                    </div>
                    <div className="flex items-center text-muted-foreground" title={`${agent.runs.toLocaleString()} runs`}>
                        <ZapIcon className="h-4 w-4" />
                        <span className="ml-1 text-foreground">{agent.runs.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <CreditIcon className="mr-1 h-3 w-3" />
                    {agent.price} / run
                </div>
            </div>
        </div>
    );
};

export default AgentCard;
