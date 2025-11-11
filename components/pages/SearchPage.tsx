
import React, { useMemo } from 'react';
import { Agent } from '../../types';
import AgentGrid from '../AgentGrid';
import { SearchIcon } from '../icons/Icons';

interface SearchPageProps {
  query: string;
  allAgents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ query, allAgents, onSelectAgent, onSelectCreator, favoriteAgentIds, onToggleFavorite }) => {
  const filteredAgents = useMemo(() => {
    if (!query) return [];
    const lowerCaseQuery = query.toLowerCase();
    return allAgents.filter(agent =>
      agent.name.toLowerCase().includes(lowerCaseQuery) ||
      agent.description.toLowerCase().includes(lowerCaseQuery) ||
      agent.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
    );
  }, [query, allAgents]);

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Search Results for "{query}"
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Found {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {filteredAgents.length > 0 ? (
        <AgentGrid
          agents={filteredAgents}
          onSelectAgent={onSelectAgent}
          onSelectCreator={onSelectCreator}
          favoriteAgentIds={favoriteAgentIds}
          onToggleFavorite={onToggleFavorite}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 py-24 text-center">
            <SearchIcon className="h-12 w-12 text-gray-600" />
            <h3 className="mt-4 text-xl font-semibold text-white">No Agents Found</h3>
            <p className="mt-2 text-sm text-gray-400">Your search for "{query}" did not return any results. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
