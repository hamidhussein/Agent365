# Contributing to AgentGrid Frontend

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Run the dev server
   ```bash
   npm run dev
   ```
3. Launch Storybook for isolated component work
   ```bash
   npm run storybook
   ```

## Development Guidelines

- **TypeScript**: keep `npm run type-check` passing (`npx tsc --noEmit`).
- **Testing**: add or update tests with `npm run test`. New components should include a `.test.tsx`.
- **Stories**: every reusable component should have a Storybook story in `*.stories.tsx`.
- **State management**: interact with Zustand stores via the existing slices in `src/lib/store`.
- **Security**: sanitize any user-provided content via helpers in `src/lib/utils/sanitize`.
- **Performance**: prefer `lazyWithRetry` for large route-level components and `useIntersectionObserver`/`OptimizedImage` for deferred UI.

## Workflow

1. Create a feature branch from `main`.
2. Make changes with clear commits.
3. Run `npm run test` and `npm run lint` (when available) before opening a PR.
4. Submit the PR with a summary, screenshots (UI), and testing notes.

## Folder Structure Reference

- `src/components/ui` – shared UI primitives
- `src/components/features` – feature-specific building blocks
- `src/components/shared` – app-wide helpers (error boundary, skip link, etc.)
- `src/lib` – hooks, schemas, API client, Zustand stores, utilities
- `src/styles` – Tailwind globals/themes

Thanks for helping keep the frontend at 10/10 quality!
