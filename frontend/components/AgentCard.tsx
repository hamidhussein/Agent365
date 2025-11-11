
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
    
    const handleCreatorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectCreator(agent.creator.username);
    }

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite(agent.id);
    }
    
    return (
        <div onClick={() => onSelect(agent.id)} className="group relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-lg hover:shadow-brand-primary/20 text-left cursor-pointer">
            <div className="relative">
                <img src={agent.imageUrl} alt={agent.name} className="h-48 w-full object-cover" />
                <button 
                    onClick={handleFavoriteClick}
                    className={`absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/50 backdrop-blur-sm transition-colors duration-200 ${isFavorited ? 'text-red-500' : 'text-white'} hover:bg-gray-900/70`}
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <HeartIcon className={`h-5 w-5 ${isFavorited ? 'fill-current' : 'fill-none'}`} />
                </button>
            </div>
            <div className="p-4">
                <div className="flex items-center space-x-2">
                    {agent.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-xs font-medium text-brand-primary">{tag}</span>
                    ))}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{agent.name}</h3>
                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-400">
                    <img src={agent.creator.avatarUrl} alt={agent.creator.name} className="h-5 w-5 rounded-full" />
                    <span>by <button onClick={handleCreatorClick} className="font-medium text-gray-300 hover:text-white hover:underline z-10 relative">{agent.creator.name}</button></span>
                </div>
                <p className="mt-2 text-sm text-gray-300 line-clamp-2">{agent.description}</p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center text-yellow-400">
                        <StarIcon className="h-4 w-4" />
                        <span className="ml-1 font-semibold text-white">{agent.rating}</span>
                        <span className="ml-1 text-gray-400">({agent.reviewCount})</span>
                    </div>
                    <span className="text-gray-600">|</span>
                    <div className="flex items-center text-gray-400" title={`${agent.runs.toLocaleString()} runs`}>
                        <ZapIcon className="h-4 w-4" />
                        <span className="ml-1 text-white">{agent.runs.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex items-center rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-400">
                    <CreditIcon className="mr-1 h-3 w-3" />
                    {agent.price} / run
                </div>
            </div>
        </div>
    );
};

export default AgentCard;
