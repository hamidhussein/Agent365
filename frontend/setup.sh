#!/usr/bin/env bash
set -euo pipefail

echo "Installing AgentGrid frontend runtime dependencies..."
npm install \
  zustand \
  immer \
  react-hook-form \
  zod \
  @hookform/resolvers \
  framer-motion \
  react-hot-toast \
  lucide-react \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-select \
  clsx \
  class-variance-authority \
  isomorphic-dompurify \
  tailwind-merge \
  date-fns \
  axios \
  @tanstack/react-query

echo "Installing AgentGrid frontend dev/test/storybook dependencies..."
npm install -D \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  vitest \
  jsdom \
  storybook \
  tailwindcss \
  postcss \
  autoprefixer \
  tailwindcss-animate \
  @tailwindcss/forms \
  @tailwindcss/typography

echo "Reminder: run 'npx storybook@latest init' once dependencies are installed to scaffold Storybook assets."
