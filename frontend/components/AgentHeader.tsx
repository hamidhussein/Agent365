
import React from 'react';
import { Agent } from '../types';
import { StarIcon, HeartIcon, ShareIcon } from './icons/Icons';

interface AgentHeaderProps {
    agent: Agent;
    onSelectCreator: (username: string) => void;
    isFavorited: boolean;
    onToggleFavorite: (agentId: string) => void;
}

const AgentHeader: React.FC<AgentHeaderProps> = ({ agent, onSelectCreator, isFavorited, onToggleFavorite }) => {
    return (
        <div>
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
                <img src={agent.imageUrl} alt={agent.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
            </div>

            <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{agent.name}</h1>
                    <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
                        <img src={agent.creator.avatarUrl} alt={agent.creator.name} className="h-6 w-6 rounded-full" />
                        <span>Created by <button onClick={() => onSelectCreator(agent.creator.username)} className="font-medium text-white hover:underline">{agent.creator.name}</button></span>
                    </div>
                </div>
                <div className="flex flex-shrink-0 items-center space-x-2">
                     <button 
                        onClick={() => onToggleFavorite(agent.id)}
                        className={`flex h-10 items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-700 ${isFavorited ? 'text-red-500' : 'text-white'}`}
                     >
                        <HeartIcon className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`}/> Favorite
                    </button>
                    <button className="flex h-10 items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-700">
                        <ShareIcon className="h-4 w-4 mr-2"/> Share
                    </button>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center text-yellow-400">
                    <StarIcon className="h-5 w-5" />
                    <span className="ml-1 font-bold text-white">{agent.rating}</span>
                    <span className="ml-1.5 text-gray-400">({agent.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center space-x-2">
                {agent.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-brand-secondary/20 px-2.5 py-1 text-xs font-medium text-brand-secondary">{tag}</span>
                ))}
                </div>
            </div>
        </div>
    );
};

export default AgentHeader;
