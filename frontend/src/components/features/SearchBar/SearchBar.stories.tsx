'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchBar } from './SearchBar';
import type { AgentFilters } from '@/lib/types';

const meta: Meta<typeof SearchBar> = {
  title: 'Features/SearchBar',
  component: SearchBar,
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  render: () => {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<AgentFilters>({});

    return (
      <SearchBar
        query={query}
        filters={filters}
        onQueryChange={setQuery}
        onFiltersChange={setFilters}
      />
    );
  },
};
