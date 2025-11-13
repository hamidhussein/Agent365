'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useIntersectionObserver } from '@/lib/hooks';
import { Skeleton } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';

interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad'> {
  skeletonClassName?: string;
}

export function OptimizedImage({
  className,
  skeletonClassName,
  alt,
  ...props
}: OptimizedImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const entry = useIntersectionObserver(wrapperRef, {
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      setIsVisible(true);
    }
  }, [entry]);

  return (
    <div ref={wrapperRef} className="relative">
      {!isLoaded && (
        <Skeleton
          className={cn('absolute inset-0', skeletonClassName)}
        />
      )}
      {isVisible && (
        <img
          {...props}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}
