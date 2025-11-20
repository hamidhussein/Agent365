

import React from 'react';
import Hero from '../Hero';
import FeaturedAgents from '../FeaturedAgents';
import { Agent } from '../../types';

interface HomePageProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({
  agents,
  onSelectAgent,
  onSelectCreator,
  favoriteAgentIds,
  onToggleFavorite,
}) => {
  return (
    <>
      <Hero />
      <FeaturedAgents
        agents={agents}
        onSelectAgent={onSelectAgent}
        onSelectCreator={onSelectCreator}
        favoriteAgentIds={favoriteAgentIds}
        onToggleFavorite={onToggleFavorite}
      />
    </>
  );
};

export default HomePage;
