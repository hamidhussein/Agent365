// @ts-nocheck


import React from 'react';
import { mockAgents } from '../constants';
import AgentCard from './AgentCard';
import { Agent } from '../types';

interface FeaturedAgentsProps {
    onSelectAgent: (agentId: string) => void;
    onSelectCreator: (username: string) => void;
    favoriteAgentIds: Set<string>;
    onToggleFavorite: (agentId: string) => void;
}

const FeaturedAgents: React.FC<FeaturedAgentsProps> = ({ onSelectAgent, onSelectCreator, favoriteAgentIds, onToggleFavorite }) => {
    const featured = mockAgents.slice(0, 4); // Show first 4 for homepage
    return (
        <section className="py-16 sm:py-24">
            <div className="container mx-auto max-w-screen-2xl px-4">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Featured Agents</h2>
                    <p className="mt-4 text-lg text-gray-400">Hand-picked agents that excel at their tasks.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {featured.map(agent => (
// @FIX: Pass isFavorited and onToggleFavorite props to AgentCard
                        <AgentCard 
                            key={agent.id} 
                            agent={agent} 
                            onSelect={onSelectAgent} 
                            onSelectCreator={onSelectCreator} 
                            isFavorited={favoriteAgentIds.has(agent.id)}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedAgents;
