import React from 'react';
import AgentCard from './AgentCard';
import { Agent } from '../types';

interface FeaturedAgentsProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const FeaturedAgents: React.FC<FeaturedAgentsProps> = ({
  agents,
  onSelectAgent,
  onSelectCreator,
  favoriteAgentIds,
  onToggleFavorite,
}) => {
  const featured = agents.slice(0, 4);

  if (!featured.length) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-display font-semibold tracking-tight text-foreground sm:text-4xl">
            Featured Agents
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hand-picked agents that excel at their tasks.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((agent) => (
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
