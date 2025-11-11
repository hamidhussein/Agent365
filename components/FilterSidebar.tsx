
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
    <div className="sticky top-20 rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">Categories</h2>
      <div className="space-y-2">
        {categories.map(category => (
          <label key={category} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCategories.has(category)}
              onChange={() => onCategoryToggle(category)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-gray-300">{category}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterSidebar;
