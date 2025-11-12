# Component Documentation

## File Structure

```
components/
├── ui/                  # Reusable UI primitives
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Modal/
│   └── Toast/
├── features/            # Feature-specific components
│   ├── AgentCard/
│   ├── SearchBar/
│   └── UserProfile/
├── layouts/             # Layout components
│   ├── Header/
│   ├── Sidebar/
│   └── Footer/
└── shared/              # Shared utilities
    ├── ErrorBoundary/
    └── LoadingSpinner/
```

## Component Guidelines

### 1. File Organization
Each component folder should contain:
- `ComponentName.tsx` – Component implementation
- `ComponentName.test.tsx` – Unit tests
- `ComponentName.stories.tsx` – Storybook stories
- `index.ts` – Barrel export

### 2. TypeScript
- Use strict typing (`noImplicitAny`).
- Export interfaces for props.
- Prefer enums for shared constants.

### 3. Styling
- Use Tailwind classes exclusively.
- Leverage the `cn()` utility for conditional classes.
- Follow the design system tokens defined in Tailwind.

### 4. Accessibility
- Provide ARIA labels for icon-only buttons.
- Ensure keyboard navigation is possible.
- Include focus-visible styles.
- Test critical flows with screen readers.

### 5. Performance
- Lazy load heavy components with `lazyWithRetry`.
- Memoize expensive calculations.
- Use stable React keys when rendering lists.

## Example Component Template

```tsx
'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  // Props here
}

export const ComponentName = forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('base-classes', className)}
        {...props}
      />
    );
  }
);
```
