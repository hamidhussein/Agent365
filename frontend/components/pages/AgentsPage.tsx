
import React, { useMemo, useState } from 'react';
import { Agent } from '../../types';
import { categories } from '../../constants';
import FilterSidebar from '../FilterSidebar';
import AgentGrid from '../AgentGrid';
import Pagination from '../Pagination';
import { ChevronDownIcon } from '../icons/Icons';

type SortOption = 'runs' | 'rating' | 'price-asc' | 'price-desc';

const AGENTS_PER_PAGE = 8;

interface AgentsPageProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onSelectCreator: (username: string) => void;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
}

const AgentsPage: React.FC<AgentsPageProps> = ({
  agents,
  onSelectAgent,
  onSelectCreator,
  favoriteAgentIds,
  onToggleFavorite,
}) => {
  const [visibleCount, setVisibleCount] = useState(AGENTS_PER_PAGE);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('runs');
  const [isSortOpen, setSortOpen] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'runs', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  const handleCategoryToggle = (category: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(category)) {
      newSelection.delete(category);
    } else {
      newSelection.add(category);
    }
    setSelectedCategories(newSelection);
    setVisibleCount(AGENTS_PER_PAGE); // Reset pagination on filter change
  };

  const filteredAndSortedAgents = useMemo(() => {
    let filteredAgents = agents;

    if (selectedCategories.size > 0) {
      filteredAgents = filteredAgents.filter(
        (agent) => agent.category && selectedCategories.has(agent.category)
      );
    }

    return [...filteredAgents].sort((a, b) => {
      switch (sortOption) {
        case 'rating':
          return b.rating - a.rating;
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'runs':
        default:
          return b.runs - a.runs;
      }
    });
  }, [agents, selectedCategories, sortOption]);

  const currentAgents = filteredAndSortedAgents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedAgents.length;

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + AGENTS_PER_PAGE, filteredAndSortedAgents.length));
  };
  
  const selectedSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label;

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
          />
        </aside>

        <main className="lg:col-span-3">
          <div className="mb-6 flex flex-col items-baseline justify-between gap-4 sm:flex-row">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">All Agents ({filteredAndSortedAgents.length})</h1>
            <div className="relative">
              <button
                onClick={() => setSortOpen(!isSortOpen)}
                className="flex h-10 items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                Sort by: {selectedSortLabel}
                <ChevronDownIcon className={`ml-2 h-4 w-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-700">
                  <div className="py-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortOption(option.value);
                          setSortOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-brand-primary hover:text-white"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {currentAgents.length > 0 ? (
            <>
              <AgentGrid agents={currentAgents} onSelectAgent={onSelectAgent} onSelectCreator={onSelectCreator} favoriteAgentIds={favoriteAgentIds} onToggleFavorite={onToggleFavorite} />
              {hasMore && <Pagination onLoadMore={loadMore} />}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 py-24 text-center">
                <h3 className="text-xl font-semibold text-white">No Agents Found</h3>
                <p className="mt-2 text-sm text-gray-400">Try adjusting your filters.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AgentsPage;
