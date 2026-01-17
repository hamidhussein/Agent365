import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
  Agent,
  AgentExecution,
  AgentFilters,
  ApiError,
  ApiResponse,
  CreditTransaction,
  Creator,
  PaginatedResponse,
  Review,
  User,
} from '@/lib/types';
import type { LoginFormData, SignupFormData } from '@/lib/schemas/auth.schema';

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8001/api/v1';

let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (
      csrfToken &&
      config.method &&
      ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
    ) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import { useAuthStore } from '@/lib/store';

// ... (existing code)

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Use the store's logout action to ensure state is updated and persistence is handled correctly
      useAuthStore.getState().logout();
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    const apiError: ApiError = {
      // FastAPI returns 'detail', custom errors might return 'message'
      message: error.response?.data?.message ?? (error.response?.data as any)?.detail ?? error.message,
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      details: error.response?.data?.details,
    };

    return Promise.reject(apiError);
  }
);

export const api = {
  auth: {
    login: (data: LoginFormData) =>
      axiosInstance.post<AuthResponse>(
        '/auth/login',
        data
      ),
    signup: (data: SignupFormData) =>
      axiosInstance.post<AuthResponse>(
        '/auth/register',
        data
      ),
    logout: () => axiosInstance.post('/auth/logout'),
    getCurrentUser: () =>
      axiosInstance.get<ApiResponse<User>>('/auth/me'),
  },

  agents: {
    list: (params?: AgentFilters & { favorited_by?: string }) => {
      // Clean undefined params
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            cleanParams[key] = value;
          }
        });
      }
      return axiosInstance.get<PaginatedResponse<Agent>>('/agents/', {
        params: cleanParams,
      });
    },
    get: (id: string) => axiosInstance.get<Agent>(`/agents/${id}`),
    create: (data: Partial<Agent>) =>
      axiosInstance.post<ApiResponse<Agent>>('/agents', data),
    update: (id: string, data: Partial<Agent>) =>
      axiosInstance.patch<ApiResponse<Agent>>(`/agents/${id}`, data),
    delete: (id: string) => axiosInstance.delete(`/agents/${id}`),
    execute: (id: string, inputs: Record<string, unknown>) =>
      axiosInstance.post<ApiResponse<AgentExecution>>(
        `/agents/${id}/execute`,
        { inputs }
      ),
  },
  executions: {
    list: (userId?: string) =>
      axiosInstance.get<PaginatedResponse<AgentExecution>>(
        '/executions',
        { params: { user_id: userId } }
      ),
    get: (id: string) =>
      axiosInstance.get<ApiResponse<AgentExecution>>(`/executions/${id}`),
    cancel: (id: string) => axiosInstance.post(`/executions/${id}/cancel`),
    requestReview: (executionId: string, note: string) =>
      axiosInstance.post<AgentExecution>(`/executions/${executionId}/review`, {
        note,
      }),
    getPendingReviews: () =>
      axiosInstance.get<PaginatedResponse<AgentExecution>>('/executions/reviews/pending'),
    getCreatorReviews: (status?: string) =>
      axiosInstance.get<PaginatedResponse<AgentExecution>>('/executions/reviews', { params: { status } }),
    respondToReview: (executionId: string, responseNote: string, refinedOutputs?: Record<string, any>) =>
      axiosInstance.post<AgentExecution>(`/executions/${executionId}/respond`, {
        response_note: responseNote,
        refined_outputs: refinedOutputs,
      }),
  },
  reviews: {
    listByAgent: (agentId: string) =>
      axiosInstance.get<PaginatedResponse<Review>>(
        `/agents/${agentId}/reviews`
      ),
    create: (agentId: string, data: Partial<Review>) =>
      axiosInstance.post<ApiResponse<Review>>(
        `/agents/${agentId}/reviews`,
        data
      ),
    update: (id: string, data: Partial<Review>) =>
      axiosInstance.patch<ApiResponse<Review>>(`/reviews/${id}`, data),
    delete: (id: string) => axiosInstance.delete(`/reviews/${id}`),
  },
  credits: {
    purchase: (amount: number) =>
      axiosInstance.post<{ status: string; new_balance: number }>('/credits/purchase', { amount }),
    getTransactions: () =>
      axiosInstance.get<PaginatedResponse<CreditTransaction>>(
        '/credits/transactions'
      ),
  },
  creators: {
    get: (id: string) =>
      axiosInstance.get<ApiResponse<Creator>>(`/creators/${id}`),
    getAgents: (id: string) =>
      axiosInstance.get<PaginatedResponse<Agent>>(
        `/creators/${id}/agents`
      ),
    update: (id: string, data: Partial<Creator>) =>
      axiosInstance.patch<ApiResponse<Creator>>(`/creators/${id}`, data),
  },
  users: {
    toggleFavorite: (agentId: string) =>
      axiosInstance.post<ApiResponse<User>>(`/users/me/favorites/${agentId}`),
    updateProfile: (data: { full_name: string }) =>
      axiosInstance.patch<User>('/users/me', data),
    updatePassword: (data: { old_password: string, new_password: string }) =>
      axiosInstance.post<{ message: string }>('/users/me/password', data),
  },
};

export default axiosInstance;
