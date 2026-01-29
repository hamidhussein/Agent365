
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm">
            <div className="relative h-64 w-full overflow-hidden">
                <img src={agent.imageUrl} alt={agent.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
            </div>

            <div className="p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{agent.name}</h1>
                        <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                            <img src={agent.creator.avatar_url || ''} alt={agent.creator.full_name || agent.creator.username} className="h-6 w-6 rounded-full border border-white/50 object-cover" />
                            <span>
                                Created by{' '}
                                <button onClick={() => onSelectCreator(agent.creator.username || '')} className="font-medium text-foreground hover:underline">
                                    {agent.creator.full_name || agent.creator.username}
                                </button>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center space-x-2">
                        <button
                            onClick={() => onToggleFavorite(agent.id)}
                            className={`flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors ${isFavorited ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-foreground hover:bg-secondary'}`}
                        >
                            <HeartIcon className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} /> Favorite
                        </button>
                        <button className="flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-secondary text-foreground">
                            <ShareIcon className="h-4 w-4 mr-2" /> Share
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center text-yellow-500">
                        <StarIcon className="h-5 w-5" />
                        <span className="ml-1 font-bold text-foreground">{agent.rating}</span>
                        <span className="ml-1.5 text-muted-foreground">({agent.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {agent.tags.map(tag => (
                            <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentHeader;
