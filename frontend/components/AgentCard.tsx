
import React from 'react';
import { Agent } from '../types';
import { StarIcon, ZapIcon, CreditIcon, HeartIcon } from './icons/Icons';

interface AgentCardProps {
    agent: Agent;
    onSelect: (agentId: string) => void;
    onSelectCreator: (username: string) => void;
    isFavorited: boolean;
    onToggleFavorite: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, onSelectCreator, isFavorited, onToggleFavorite }) => {

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
        <div onClick={() => onSelect(agent.id)} className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/10 text-left cursor-pointer">
            <div className="relative overflow-hidden">
                <img 
                    src={agent.imageUrl} 
                    alt={agent.name} 
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <button
                    onClick={handleFavoriteClick}
                    className={`absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 backdrop-blur-md shadow-lg transition-all duration-300 ${isFavorited ? 'text-red-500 scale-110' : 'text-foreground hover:scale-110'} border border-white/10`}
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <HeartIcon className={`h-5 w-5 ${isFavorited ? 'fill-current' : 'fill-none'}`} />
                </button>
            </div>
            <div className="p-5">
                <div className="flex items-center gap-2 flex-wrap">
                    {isCreatorStudio && (
                        <span className="rounded-lg bg-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 shadow-sm">
                            Creator Studio
                        </span>
                    )}
                    {agent.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-lg bg-secondary/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border/50">
                            {tag}
                        </span>
                    ))}
                </div>
                <h3 className="mt-4 text-xl font-black text-card-foreground leading-tight group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                    {agent.name}
                </h3>
                <div className="mt-3 flex items-center space-x-2.5 text-sm">
                    <div className="relative">
                        <img src={agent.creator.avatar_url || ''} alt={agent.creator.username} className="h-6 w-6 rounded-full ring-2 ring-primary/20" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        by <button onClick={handleCreatorClick} className="font-bold text-foreground hover:text-primary transition-colors z-10 relative lowercase">@{agent.creator.username}</button>
                    </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed font-medium">
                    {agent.description}
                </p>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/30 p-4">
                <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center text-amber-500">
                        <StarIcon className="h-4 w-4 fill-current" />
                        <span className="ml-1.5 font-bold text-card-foreground">{agent.rating}</span>
                        <span className="ml-1 text-muted-foreground">({agent.reviewCount})</span>
                    </div>
                    <span className="mx-1 text-border">|</span>
                    <div className="flex items-center text-muted-foreground" title={`${agent.runs.toLocaleString()} runs`}>
                        <ZapIcon className="h-4 w-4" />
                        <span className="ml-1.5 font-medium text-card-foreground">{agent.runs.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
                    <CreditIcon className="mr-1.5 h-3.5 w-3.5" />
                    {agent.price} / run
                </div>
            </div>
        </div>
    );
};

export default AgentCard;
