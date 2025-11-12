import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
  Agent,
  AgentExecution,
  AgentFilters,
  ApiError,
  ApiResponse,
  CreditTransaction,
  Creator,
  LoginFormData,
  PaginatedResponse,
  Review,
  SignupFormData,
  User,
} from '@/lib/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:8000/api/v1';

let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
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

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    const apiError: ApiError = {
      message: error.response?.data?.message ?? error.message,
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      details: error.response?.data?.details,
    };

    return Promise.reject(apiError);
  }
);

export const api = {
  auth: {
    login: (data: LoginFormData) =>
      axiosInstance.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/login',
        data
      ),
    signup: (data: SignupFormData) =>
      axiosInstance.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/signup',
        data
      ),
    logout: () => axiosInstance.post('/auth/logout'),
    getCurrentUser: () =>
      axiosInstance.get<ApiResponse<User>>('/auth/me'),
  },
  agents: {
    list: (filters?: AgentFilters) =>
      axiosInstance.get<PaginatedResponse<Agent>>('/agents', {
        params: filters,
      }),
    get: (id: string) =>
      axiosInstance.get<ApiResponse<Agent>>(`/agents/${id}`),
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
    getBalance: () =>
      axiosInstance.get<ApiResponse<{ balance: number }>>(
        '/credits/balance'
      ),
    purchasePackage: (packageId: string, paymentMethodId: string) =>
      axiosInstance.post<ApiResponse<CreditTransaction>>(
        '/credits/purchase',
        { package_id: packageId, payment_method_id: paymentMethodId }
      ),
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
};

export default axiosInstance;
