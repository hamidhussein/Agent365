'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { AgentCategory, AgentFilters } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const ratingOptions = [5, 4, 3, 2];
const sortOptions: Array<{ value: AgentFilters['sort_by']; label: string }> = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

export interface SearchBarProps {
  query: string;
  filters?: AgentFilters;
  onQueryChange?: (value: string) => void;
  onFiltersChange?: (filters: AgentFilters) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  query,
  filters,
  onQueryChange,
  onFiltersChange,
  debounceMs = 400,
  className,
}: SearchBarProps) {
  const [internalQuery, setInternalQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<AgentFilters>(filters || {});

  useEffect(() => {
    setInternalQuery(query);
  }, [query]);

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalQuery !== query) {
        onQueryChange?.(internalQuery);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [internalQuery, debounceMs, onQueryChange, query]);

  const categories = useMemo(
    () =>
      Object.values(AgentCategory).map((category) => ({
        value: category,
        label: category.replace('_', ' '),
      })),
    []
  );

  const handleFilterChange = (updates: Partial<AgentFilters>) => {
    const next = { ...localFilters, ...updates };
    setLocalFilters(next);
  };

  const applyFilters = () => {
    onFiltersChange?.(localFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalFilters({});
    onFiltersChange?.({});
  };

  return (
    <div className={cn('space-y-3 rounded-xl border bg-card p-4', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={internalQuery}
            onChange={(event) => setInternalQuery(event.target.value)}
            placeholder="Search agents by name, capability, or keyword"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
          {Object.keys(filters || {}).length > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Category
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={localFilters.category || ''}
              onChange={(event) =>
                handleFilterChange({
                  category: event.target.value
                    ? (event.target.value as AgentCategory)
                    : undefined,
                })
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Minimum Rating
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={localFilters.min_rating || ''}
              onChange={(event) =>
                handleFilterChange({
                  min_rating: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Any rating</option>
              {ratingOptions.map((value) => (
                <option key={value} value={value}>
                  {value}+ stars
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Max Price (credits)
            </label>
            <Input
              type="number"
              min={0}
              value={localFilters.max_price ?? ''}
              onChange={(event) =>
                handleFilterChange({
                  max_price: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              placeholder="e.g. 50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Sort By
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={localFilters.sort_by || ''}
              onChange={(event) =>
                handleFilterChange({
                  sort_by: event.target.value
                    ? (event.target.value as AgentFilters['sort_by'])
                    : undefined,
                })
              }
            >
              <option value="">Default</option>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value || ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={clearFilters}>
              Reset
            </Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  );
}
