import React, { ReactNode } from 'react';

interface StudioHeaderProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export const StudioHeader = ({ left, center, right, className = '' }: StudioHeaderProps) => {
  return (
    <div className={`h-16 flex items-center justify-between px-5 border-b border-border bg-card/90 backdrop-blur-md shrink-0 sticky top-0 z-30 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center overflow-hidden min-w-0 flex-[1_1_0%]">
        {left}
      </div>
      
      {center && (
        <div className="flex justify-center items-center shrink-0 mx-4">
          {center}
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 flex-[1_1_0%] shrink-0">
        {right}
      </div>
    </div>
  );
};
