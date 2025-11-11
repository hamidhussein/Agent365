
import React from 'react';
import { Agent } from '../types';
import AgentCard from './AgentCard';

interface AgentGridProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const AgentGrid: React.FC<AgentGridProps> = ({ agents, onSelectAgent, onSelectCreator, favoriteAgentIds, onToggleFavorite }) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {agents.map(agent => (
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
  );
};

export default AgentGrid;
