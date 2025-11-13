import { useEffect, useState, type RefObject } from 'react';

export interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  elementRef: RefObject<T | null>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  }: UseIntersectionObserverOptions = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const isFrozen = entry?.isIntersecting && freezeOnceVisible;

  useEffect(() => {
    const node = elementRef.current;
    if (!node || isFrozen) {
      return;
    }

    const observer = new IntersectionObserver(
      ([obEntry]) => setEntry(obEntry),
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [elementRef, threshold, root, rootMargin, isFrozen]);

  return entry;
}
