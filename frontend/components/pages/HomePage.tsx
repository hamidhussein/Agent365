

import React from 'react';
import Hero from '../Hero';
import FeaturedAgents from '../FeaturedAgents';

interface HomePageProps {
    onSelectAgent: (agentId: string) => void;
    onSelectCreator: (username: string) => void;
// @FIX: Add favoriteAgentIds and onToggleFavorite to props
    favoriteAgentIds: Set<string>;
    onToggleFavorite: (agentId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSelectAgent, onSelectCreator, favoriteAgentIds, onToggleFavorite }) => {
  return (
    <>
      <Hero />
{/* @FIX: Pass favoriteAgentIds and onToggleFavorite to FeaturedAgents */}
      <FeaturedAgents onSelectAgent={onSelectAgent} onSelectCreator={onSelectCreator} favoriteAgentIds={favoriteAgentIds} onToggleFavorite={onToggleFavorite} />
    </>
  );
};

export default HomePage;