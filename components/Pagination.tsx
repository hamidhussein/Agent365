
import React from 'react';

interface PaginationProps {
  onLoadMore: () => void;
}

const Pagination: React.FC<PaginationProps> = ({ onLoadMore }) => {
  return (
    <div className="mt-10 text-center">
      <button
        onClick={onLoadMore}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-primary px-8 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Load More Agents
      </button>
    </div>
  );
};

export default Pagination;
