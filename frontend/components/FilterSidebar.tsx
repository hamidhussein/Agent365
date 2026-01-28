
import React from 'react';
import { Category } from '../types';

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: Set<Category>;
  onCategoryToggle: (category: Category) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
}) => {
  return (
    <div className="sticky top-20 rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Categories</h2>
      <div className="space-y-2">
        {categories.map(category => (
          <label key={category} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCategories.has(category)}
              onChange={() => onCategoryToggle(category)}
              className="h-4 w-4 rounded border-input bg-secondary text-primary focus:ring-primary"
            />
            <span className="text-muted-foreground">{category}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterSidebar;
