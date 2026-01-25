
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
            <div className="relative">
                <img src={agent.imageUrl} alt={agent.name} className="h-48 w-full object-cover" />
                <button
                    onClick={handleFavoriteClick}
                    className={`absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm shadow-sm transition-colors duration-200 ${isFavorited ? 'text-red-500' : 'text-foreground'} hover:bg-background/80`}
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <HeartIcon className={`h-5 w-5 ${isFavorited ? 'fill-current' : 'fill-none'}`} />
                </button>
            </div>
            <div className="p-4">
                <div className="flex items-center space-x-2">
                    {isCreatorStudio && (<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Creator Studio</span>)}
                    {agent.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{tag}</span>
                    ))}
                </div>
                <h3 className="mt-3 text-lg font-bold text-card-foreground leading-tight group-hover:text-primary transition-colors">{agent.name}</h3>
                <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                    <img src={agent.creator.avatar_url || ''} alt={agent.creator.full_name || agent.creator.username} className="h-5 w-5 rounded-full ring-1 ring-border" />
                    <span>by <button onClick={handleCreatorClick} className="font-medium text-foreground hover:text-primary hover:underline z-10 relative">{agent.creator.full_name || agent.creator.username}</button></span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{agent.description}</p>
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
