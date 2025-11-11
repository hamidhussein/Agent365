# AgentGrid V0 Frontend Refactoring Guide
## Transform Your Project to 10/10 Quality

**Purpose:** This guide provides detailed instructions for VS Code Copilot/Cursor AI assistants to refactor the AgentGrid V0 frontend to production-grade quality. Each section includes specific file changes, code examples, and implementation priorities.

---

## 📋 OVERVIEW: What We're Fixing

### Current State Assessment
Your AgentGrid V0 frontend currently has these gaps:
1. **Component Architecture** - Monolithic components need to be broken into reusable pieces
2. **State Management** - No centralized state management (Redux/Zustand)
3. **Type Safety** - Inconsistent TypeScript usage and missing type definitions
4. **Performance** - Missing code splitting, lazy loading, and optimization
5. **User Experience** - Incomplete loading states, error handling, and feedback
6. **Design System** - Inconsistent styling, no design token system
7. **Accessibility** - Missing ARIA labels, keyboard navigation, and screen reader support
8. **Testing** - No unit tests, integration tests, or E2E tests
9. **Security** - Missing input sanitization and XSS protection
10. **Developer Experience** - No Storybook, incomplete documentation

### Target State (10/10)
After implementing these changes, your frontend will have:
- ✅ Production-grade component architecture
- ✅ Centralized state management with Zustand
- ✅ Full TypeScript coverage with strict mode
- ✅ Optimized performance (code splitting, lazy loading)
- ✅ Professional UX with loading states, error boundaries, and toast notifications
- ✅ Consistent design system with Tailwind config
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ 80%+ test coverage
- ✅ Security best practices implemented
- ✅ Storybook for component development

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2) - PRIORITY
1. Setup TypeScript strict mode
2. Install and configure essential dependencies
3. Create folder structure
4. Setup design system (Tailwind config)
5. Create base types and interfaces

### Phase 2: Core Architecture (Week 2-4)
6. Implement state management (Zustand)
7. Create reusable component library
8. Setup routing architecture
9. Implement error boundaries
10. Create loading skeleton components

### Phase 3: Features & UX (Week 4-6)
11. Refactor page components
12. Implement form validation
13. Add toast notifications
14. Create modal system
15. Implement search/filter functionality

### Phase 4: Quality & Performance (Week 6-8)
16. Add lazy loading and code splitting
17. Implement accessibility features
18. Add security measures
19. Setup testing framework
20. Create Storybook

---

## 📁 STEP 1: PROJECT STRUCTURE SETUP

### Current Structure (Assumed)
```
src/
├── pages/
├── components/
├── styles/
└── utils/
```

### New Structure (Target)
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   ├── (dashboard)/              # Dashboard layout group
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── Toast/
│   ├── features/                 # Feature-specific components
│   │   ├── AgentCard/
│   │   ├── AgentDetail/
│   │   ├── SearchBar/
│   │   └── UserProfile/
│   ├── layouts/                  # Layout components
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   └── shared/                   # Shared components
│       ├── ErrorBoundary/
│       ├── LoadingSpinner/
│       └── ProtectedRoute/
├── lib/
│   ├── api/                      # API client functions
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand store
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utility functions
│   └── constants/                # Constants and enums
├── styles/
│   ├── globals.css
│   └── themes/
└── config/
    ├── tailwind.config.js
    └── site.config.ts
```

### VS Code Copilot Prompt:
```
Create the following folder structure in the src/ directory:
- components/ui/ with subfolders: Button, Input, Card, Modal, Toast
- components/features/ with subfolders: AgentCard, AgentDetail, SearchBar, UserProfile
- components/layouts/ with subfolders: Header, Sidebar, Footer
- components/shared/ with subfolders: ErrorBoundary, LoadingSpinner, ProtectedRoute
- lib/api/, lib/hooks/, lib/store/, lib/types/, lib/utils/, lib/constants/
- config/ with tailwind.config.js and site.config.ts

Create index.ts files in each component folder for clean imports.
```

---

## 🔧 STEP 2: INSTALL DEPENDENCIES

### Required Dependencies
Add these to your `package.json`:

```bash
# State Management
npm install zustand immer

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# UI & Animations
npm install framer-motion react-hot-toast lucide-react
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-select

# Utilities
npm install clsx tailwind-merge date-fns

# API
npm install axios react-query

# Testing
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom

# Storybook
npx storybook@latest init
```

### VS Code Copilot Prompt:
```
Update package.json to include these dependencies:
- zustand and immer for state management
- react-hook-form, zod, and @hookform/resolvers for forms
- framer-motion, react-hot-toast, lucide-react for UI
- @radix-ui components (dropdown-menu, dialog, select)
- clsx, tailwind-merge, date-fns for utilities
- axios and react-query for API
- testing-library packages and vitest for testing
- storybook for component development

Then create appropriate npm install commands in a setup.sh file.
```

---

## ⚙️ STEP 3: TYPESCRIPT CONFIGURATION

### Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/styles/*": ["./src/styles/*"],
      "@/config/*": ["./src/config/*"]
    },
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### VS Code Copilot Prompt:
```
Update the tsconfig.json file with strict mode enabled and all recommended TypeScript rules. Include path aliases for @/components, @/lib, @/styles, and @/config. Enable all strict flags including strictNullChecks, noUnusedLocals, and noImplicitReturns.
```

---

## 🎨 STEP 4: TAILWIND DESIGN SYSTEM

### Create `tailwind.config.js` with Design Tokens
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#92400e',
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
}
```

### Create `src/styles/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .glass-effect {
    @apply bg-white/10 backdrop-blur-lg border border-white/20;
  }
  
  .gradient-primary {
    @apply bg-gradient-to-r from-primary-500 to-primary-700;
  }
  
  .gradient-text {
    @apply bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent;
  }
}
```

### VS Code Copilot Prompt:
```
Create a comprehensive Tailwind config with:
1. Full design token system including primary, secondary, success, warning colors
2. Custom animations: fade-in, slide-in-right, shimmer for loading states
3. Custom spacing and max-width utilities
4. Dark mode support with CSS variables
5. Import tailwindcss-animate, @tailwindcss/forms, and @tailwindcss/typography plugins

Then create globals.css with CSS variables for theming and utility classes for glass-effect and gradient effects.
```

---

## 📦 STEP 5: CORE TYPE DEFINITIONS

### Create `src/lib/types/index.ts`
```typescript
// ============= USER TYPES =============
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  credits: number;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  ADMIN = 'admin',
}

// ============= AGENT TYPES =============
export interface Agent {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  category: AgentCategory;
  tags: string[];
  creator_id: string;
  creator: Creator;
  version: string;
  price_per_run: number;
  rating: number;
  total_runs: number;
  total_reviews: number;
  status: AgentStatus;
  config: AgentConfig;
  capabilities: string[];
  limitations?: string[];
  thumbnail_url?: string;
  demo_available: boolean;
  created_at: string;
  updated_at: string;
}

export enum AgentCategory {
  CONTENT = 'content',
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  AUTOMATION = 'automation',
  DEVELOPMENT = 'development',
  DESIGN = 'design',
  MARKETING = 'marketing',
  CUSTOMER_SERVICE = 'customer_service',
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
}

export interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  required_inputs: AgentInput[];
  output_schema: Record<string, any>;
}

export interface AgentInput {
  name: string;
  type: 'text' | 'file' | 'url' | 'json';
  required: boolean;
  description: string;
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

// ============= CREATOR TYPES =============
export interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  social_links?: SocialLinks;
  total_agents: number;
  total_earnings: number;
  avg_rating: number;
  verified: boolean;
  created_at: string;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  linkedin?: string;
}

// ============= EXECUTION TYPES =============
export interface AgentExecution {
  id: string;
  agent_id: string;
  user_id: string;
  status: ExecutionStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error_message?: string;
  credits_used: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============= REVIEW TYPES =============
export interface Review {
  id: string;
  agent_id: string;
  user_id: string;
  user: Pick<User, 'id' | 'username' | 'avatar_url'>;
  rating: number;
  title: string;
  comment: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

// ============= CREDIT & PAYMENT TYPES =============
export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  reference_id?: string;
  created_at: string;
}

export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  EARNING = 'earning',
  PAYOUT = 'payout',
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  bonus_credits: number;
  popular: boolean;
}

// ============= API RESPONSE TYPES =============
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

// ============= FORM TYPES =============
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AgentExecutionFormData {
  inputs: Record<string, any>;
}

// ============= FILTER & SEARCH TYPES =============
export interface AgentFilters {
  category?: AgentCategory;
  min_rating?: number;
  max_price?: number;
  tags?: string[];
  search_query?: string;
  sort_by?: 'popular' | 'rating' | 'newest' | 'price_low' | 'price_high';
}
```

### VS Code Copilot Prompt:
```
Create a comprehensive TypeScript types file at src/lib/types/index.ts with:
1. User, Agent, Creator, Review, and Execution types
2. Enums for UserRole, AgentStatus, ExecutionStatus, TransactionType
3. API response types (ApiResponse, PaginatedResponse, ApiError)
4. Form data types for login, signup, and agent execution
5. Filter and search types
6. Proper JSDoc comments for each type

Use strict typing with no "any" types except where explicitly needed (like outputs).
```

---

## 🏪 STEP 6: STATE MANAGEMENT (ZUSTAND)

### Create `src/lib/store/index.ts`
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============= AUTH STORE =============
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateCredits: (amount: number) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        
        login: (user) => set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
        }),
        
        logout: () => set((state) => {
          state.user = null;
          state.isAuthenticated = false;
        }),
        
        updateUser: (updates) => set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...updates };
          }
        }),
        
        updateCredits: (amount) => set((state) => {
          if (state.user) {
            state.user.credits += amount;
          }
        }),
      })),
      { name: 'auth-storage' }
    )
  )
);

// ============= AGENT STORE =============
interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  filters: AgentFilters;
  isLoading: boolean;
  error: string | null;
  setAgents: (agents: Agent[]) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  updateFilters: (filters: Partial<AgentFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    immer((set) => ({
      agents: [],
      selectedAgent: null,
      filters: {},
      isLoading: false,
      error: null,
      
      setAgents: (agents) => set((state) => {
        state.agents = agents;
      }),
      
      setSelectedAgent: (agent) => set((state) => {
        state.selectedAgent = agent;
      }),
      
      updateFilters: (filters) => set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),
      
      clearFilters: () => set((state) => {
        state.filters = {};
      }),
      
      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),
      
      setError: (error) => set((state) => {
        state.error = error;
      }),
    }))
  )
);

// ============= UI STORE =============
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toasts: Toast[];
  modals: {
    loginOpen: boolean;
    signupOpen: boolean;
    executionOpen: boolean;
  };
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set) => ({
      sidebarOpen: true,
      theme: 'system',
      toasts: [],
      modals: {
        loginOpen: false,
        signupOpen: false,
        executionOpen: false,
      },
      
      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),
      
      setTheme: (theme) => set((state) => {
        state.theme = theme;
      }),
      
      addToast: (toast) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        state.toasts.push({ ...toast, id });
      }),
      
      removeToast: (id) => set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      }),
      
      openModal: (modal) => set((state) => {
        state.modals[modal] = true;
      }),
      
      closeModal: (modal) => set((state) => {
        state.modals[modal] = false;
      }),
    }))
  )
);

// ============= EXECUTION STORE =============
interface ExecutionState {
  executions: AgentExecution[];
  activeExecution: AgentExecution | null;
  addExecution: (execution: AgentExecution) => void;
  updateExecution: (id: string, updates: Partial<AgentExecution>) => void;
  setActiveExecution: (execution: AgentExecution | null) => void;
  clearExecutions: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    persist(
      immer((set) => ({
        executions: [],
        activeExecution: null,
        
        addExecution: (execution) => set((state) => {
          state.executions.unshift(execution);
        }),
        
        updateExecution: (id, updates) => set((state) => {
          const index = state.executions.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.executions[index] = { ...state.executions[index], ...updates };
          }
          if (state.activeExecution?.id === id) {
            state.activeExecution = { ...state.activeExecution, ...updates };
          }
        }),
        
        setActiveExecution: (execution) => set((state) => {
          state.activeExecution = execution;
        }),
        
        clearExecutions: () => set((state) => {
          state.executions = [];
        }),
      })),
      { name: 'execution-storage' }
    )
  )
);
```

### VS Code Copilot Prompt:
```
Create Zustand stores at src/lib/store/index.ts with:
1. AuthStore: user authentication, login/logout, credit management
2. AgentStore: agent list, selected agent, filters, loading/error states
3. UIStore: sidebar, theme, toasts, modal controls
4. ExecutionStore: execution history, active execution tracking

Use zustand/middleware for devtools, persist (auth & execution), and immer for immutable updates. Include proper TypeScript types for all stores.
```

---

## 🎣 STEP 7: CUSTOM HOOKS

### Create `src/lib/hooks/useAuth.ts`
```typescript
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const router = useRouter();

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      login(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (data: SignupFormData) => {
    try {
      const response = await api.auth.signup(data);
      login(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
      logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const requireAuth = (redirectUrl = '/login') => {
    if (!isAuthenticated) {
      router.push(redirectUrl);
      return false;
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    requireAuth,
  };
}
```

### Create `src/lib/hooks/useAgents.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api/client';
import { useAgentStore } from '@/lib/store';

export function useAgents(filters?: AgentFilters) {
  const queryClient = useQueryClient();
  const { setAgents, setLoading, setError } = useAgentStore();

  const query = useQuery(
    ['agents', filters],
    () => api.agents.list(filters),
    {
      onSuccess: (data) => {
        setAgents(data.data);
        setLoading(false);
      },
      onError: (error: any) => {
        setError(error.message);
        setLoading(false);
      },
    }
  );

  return query;
}

export function useAgent(agentId: string) {
  return useQuery(
    ['agent', agentId],
    () => api.agents.get(agentId),
    {
      enabled: !!agentId,
    }
  );
}

export function useExecuteAgent() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ agentId, inputs }: { agentId: string; inputs: any }) =>
      api.agents.execute(agentId, inputs),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['executions']);
      },
    }
  );
}
```

### Create `src/lib/hooks/useToast.ts`
```typescript
import { useUIStore } from '@/lib/store';
import { useCallback } from 'react';

export function useToast() {
  const { addToast, removeToast } = useUIStore();

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) => {
      addToast({ message, type, duration });
    },
    [addToast]
  );

  return {
    toast,
    success: (message: string) => toast(message, 'success'),
    error: (message: string) => toast(message, 'error'),
    warning: (message: string) => toast(message, 'warning'),
    info: (message: string) => toast(message, 'info'),
  };
}
```

### VS Code Copilot Prompt:
```
Create custom React hooks in src/lib/hooks/:
1. useAuth.ts: signIn, signUp, signOut, requireAuth functions using Zustand store and API client
2. useAgents.ts: useAgents (list with filters), useAgent (single), useExecuteAgent mutation using react-query
3. useToast.ts: toast notification helpers (success, error, warning, info) using UI store

Include proper error handling, TypeScript types, and React Query cache invalidation.
```

---

## 🌐 STEP 8: API CLIENT

### Create `src/lib/api/client.ts`
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, PaginatedResponse, ApiError } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      details: error.response?.data?.details,
    };
    
    return Promise.reject(apiError);
  }
);

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (data: LoginFormData) =>
      axiosInstance.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data),
    
    signup: (data: SignupFormData) =>
      axiosInstance.post<ApiResponse<{ user: User; token: string }>>('/auth/signup', data),
    
    logout: () =>
      axiosInstance.post('/auth/logout'),
    
    getCurrentUser: () =>
      axiosInstance.get<ApiResponse<User>>('/auth/me'),
  },

  // Agent endpoints
  agents: {
    list: (filters?: AgentFilters) =>
      axiosInstance.get<PaginatedResponse<Agent>>('/agents', { params: filters }),
    
    get: (id: string) =>
      axiosInstance.get<ApiResponse<Agent>>(`/agents/${id}`),
    
    create: (data: Partial<Agent>) =>
      axiosInstance.post<ApiResponse<Agent>>('/agents', data),
    
    update: (id: string, data: Partial<Agent>) =>
      axiosInstance.patch<ApiResponse<Agent>>(`/agents/${id}`, data),
    
    delete: (id: string) =>
      axiosInstance.delete(`/agents/${id}`),
    
    execute: (id: string, inputs: any) =>
      axiosInstance.post<ApiResponse<AgentExecution>>(`/agents/${id}/execute`, { inputs }),
  },

  // Execution endpoints
  executions: {
    list: (userId?: string) =>
      axiosInstance.get<PaginatedResponse<AgentExecution>>('/executions', {
        params: { user_id: userId },
      }),
    
    get: (id: string) =>
      axiosInstance.get<ApiResponse<AgentExecution>>(`/executions/${id}`),
    
    cancel: (id: string) =>
      axiosInstance.post(`/executions/${id}/cancel`),
  },

  // Review endpoints
  reviews: {
    listByAgent: (agentId: string) =>
      axiosInstance.get<PaginatedResponse<Review>>(`/agents/${agentId}/reviews`),
    
    create: (agentId: string, data: Partial<Review>) =>
      axiosInstance.post<ApiResponse<Review>>(`/agents/${agentId}/reviews`, data),
    
    update: (id: string, data: Partial<Review>) =>
      axiosInstance.patch<ApiResponse<Review>>(`/reviews/${id}`, data),
    
    delete: (id: string) =>
      axiosInstance.delete(`/reviews/${id}`),
  },

  // Credit endpoints
  credits: {
    getBalance: () =>
      axiosInstance.get<ApiResponse<{ balance: number }>>('/credits/balance'),
    
    purchasePackage: (packageId: string, paymentMethodId: string) =>
      axiosInstance.post<ApiResponse<CreditTransaction>>('/credits/purchase', {
        package_id: packageId,
        payment_method_id: paymentMethodId,
      }),
    
    getTransactions: () =>
      axiosInstance.get<PaginatedResponse<CreditTransaction>>('/credits/transactions'),
  },

  // Creator endpoints
  creators: {
    get: (id: string) =>
      axiosInstance.get<ApiResponse<Creator>>(`/creators/${id}`),
    
    getAgents: (id: string) =>
      axiosInstance.get<PaginatedResponse<Agent>>(`/creators/${id}/agents`),
    
    update: (id: string, data: Partial<Creator>) =>
      axiosInstance.patch<ApiResponse<Creator>>(`/creators/${id}`, data),
  },
};

export default axiosInstance;
```

### VS Code Copilot Prompt:
```
Create API client at src/lib/api/client.ts with:
1. Axios instance with 30s timeout and proper headers
2. Request interceptor for auth token injection
3. Response interceptor for 401 handling and error transformation
4. API methods organized by domain: auth, agents, executions, reviews, credits, creators
5. Proper TypeScript return types using ApiResponse and PaginatedResponse
6. Environment variable for BASE_URL with localhost fallback

Use proper error handling and token management.
```

---

## 🧩 STEP 9: REUSABLE UI COMPONENTS

### Create `src/components/ui/Button/Button.tsx`
```typescript
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Create `src/components/ui/Input/Input.tsx`
```typescript
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

### Create `src/components/ui/Card/Card.tsx`
```typescript
import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

### VS Code Copilot Prompt:
```
Create reusable UI components in src/components/ui/:
1. Button component with variants (default, destructive, outline, secondary, ghost, link), sizes (sm, default, lg, icon), loading state, and proper TypeScript types
2. Input component with error message, label, and focus states
3. Card component with subcomponents (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)

Use class-variance-authority for button variants, forwardRef for all components, and proper accessibility attributes. Include a utils function at src/lib/utils/cn.ts for className merging.
```

---

## 🎭 STEP 10: ERROR BOUNDARY & LOADING STATES

### Create `src/components/shared/ErrorBoundary/ErrorBoundary.tsx`
```typescript
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Create `src/components/shared/LoadingSpinner/LoadingSpinner.tsx`
```typescript
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <svg
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Full page loading
export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Skeleton loader
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
}
```

### VS Code Copilot Prompt:
```
Create error handling components in src/components/shared/:
1. ErrorBoundary.tsx - React Error Boundary class component with fallback UI, reload/home buttons, and error logging
2. LoadingSpinner.tsx - Animated spinner with sizes (sm, md, lg), LoadingPage for full-page loading, and Skeleton component for loading placeholders

Include proper TypeScript types and accessibility attributes.
```

---

*Continuing with STEP 11-20 in next section...*

---

## 📄 IMPLEMENTATION SUMMARY

This guide has covered the first 10 critical steps:
1. ✅ Project structure setup
2. ✅ Dependency installation
3. ✅ TypeScript configuration
4. ✅ Tailwind design system
5. ✅ Core type definitions
6. ✅ State management (Zustand)
7. ✅ Custom hooks
8. ✅ API client
9. ✅ Reusable UI components
10. ✅ Error boundary & loading states

**Next Steps (Steps 11-20):**
- Feature-specific components (AgentCard, SearchBar, etc.)
- Page refactoring (Home, Agent Detail, Dashboard)
- Form validation with react-hook-form + zod
- Modal system and toast notifications
- Accessibility improvements
- Performance optimization
- Testing setup
- Security hardening
- Storybook setup
- Documentation

**Would you like me to continue with Steps 11-20?**
