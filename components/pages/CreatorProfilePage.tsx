
import React from 'react';
import { Agent } from '../../types';
import CreatorProfileHeader from '../creator/CreatorProfileHeader';
import AgentGrid from '../AgentGrid';

interface CreatorProfilePageProps {
    creator: Agent['creator'];
    agents: Agent[];
    onSelectAgent: (agentId: string) => void;
    favoriteAgentIds: Set<string>;
    onToggleFavorite: (agentId: string) => void;
}

const CreatorProfilePage: React.FC<CreatorProfilePageProps> = ({ creator, agents, onSelectAgent, favoriteAgentIds, onToggleFavorite }) => {
    
    // We pass onSelectCreator even though we are on the creator page, 
    // because AgentGrid expects it. It won't be used here.
    const placeholderSelectCreator = () => {};

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <CreatorProfileHeader creator={creator} agents={agents} />

            <div className="mt-12">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Agents by {creator.name}</h2>
                <div className="mt-6">
                    <AgentGrid agents={agents} onSelectAgent={onSelectAgent} onSelectCreator={placeholderSelectCreator} favoriteAgentIds={favoriteAgentIds} onToggleFavorite={onToggleFavorite} />
                </div>
            </div>
        </div>
    );
};

export default CreatorProfilePage;
