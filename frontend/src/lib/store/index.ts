import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Agent,
  AgentExecution,
  AgentFilters,
  User,
} from '@/lib/types';

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
    immer<AuthState>((set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.isLoading = false;
        }),

      updateUser: (updates) =>
        set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...updates };
          }
        }),

      updateCredits: (amount) =>
        set((state) => {
          if (state.user) {
            state.user.credits += amount;
          }
        }),
    }))
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
    immer<AgentState>((set) => ({
      agents: [],
      selectedAgent: null,
      filters: {},
      isLoading: false,
      error: null,

      setAgents: (agents) =>
        set((state) => {
          state.agents = agents;
        }),

      setSelectedAgent: (agent) =>
        set((state) => {
          state.selectedAgent = agent;
        }),

      updateFilters: (filters) =>
        set((state) => {
          state.filters = { ...state.filters, ...filters };
        }),

      clearFilters: () =>
        set((state) => {
          state.filters = {};
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),
    }))
  )
);

// ============= UI STORE =============
type ThemePreference = 'light' | 'dark' | 'system';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  theme: ThemePreference;
  toasts: Toast[];
  modals: {
    loginOpen: boolean;
    signupOpen: boolean;
    executionOpen: boolean;
  };
  toggleSidebar: () => void;
  setTheme: (theme: ThemePreference) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer<UIState>((set) => ({
      sidebarOpen: true,
      theme: 'system',
      toasts: [],
      modals: {
        loginOpen: false,
        signupOpen: false,
        executionOpen: false,
      },

      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),

      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      addToast: (toast) =>
        set((state) => {
          const id = Math.random().toString(36).slice(2, 11);
          state.toasts.push({ ...toast, id });
        }),

      removeToast: (id) =>
        set((state) => {
          state.toasts = state.toasts.filter((toast) => toast.id !== id);
        }),

      openModal: (modal) =>
        set((state) => {
          state.modals[modal] = true;
        }),

      closeModal: (modal) =>
        set((state) => {
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
      immer<ExecutionState>((set) => ({
        executions: [],
        activeExecution: null,

        addExecution: (execution) =>
          set((state) => {
            state.executions.unshift(execution);
          }),

        updateExecution: (id, updates) =>
          set((state) => {
            const index = state.executions.findIndex((exec) => exec.id === id);
            if (index !== -1) {
              state.executions[index] = {
                ...state.executions[index],
                ...updates,
              };
            }
            if (state.activeExecution?.id === id) {
              state.activeExecution = {
                ...state.activeExecution,
                ...updates,
              };
            }
          }),

        setActiveExecution: (execution) =>
          set((state) => {
            state.activeExecution = execution;
          }),

        clearExecutions: () =>
          set((state) => {
            state.executions = [];
            state.activeExecution = null;
          }),
      })),
      { name: 'execution-storage' }
    )
  )
);
