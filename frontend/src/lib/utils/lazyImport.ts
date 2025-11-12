import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await componentImport();
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    throw new Error('Failed to load component');
  });
}
