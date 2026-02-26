import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
  ApiError,
  ApiResponse,
  User,
} from '@/lib/types';
import type { LoginFormData, SignupFormData } from '@/lib/schemas/auth.schema';
import { clearAuthToken, getAuthToken } from '@/lib/auth/tokenStore';

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:8001/api/v1'
).trim();

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
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      useAuthStore.getState().logout();
      clearAuthToken();
      window.location.href = '/login';
    }

    const apiError: ApiError = {
      // FastAPI returns 'detail', custom errors might return 'message'
      message: error.response?.data?.message ?? (error.response?.data as any)?.detail ?? error.message,
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      details: error.response?.data?.details,
    };

    if (error.response?.status !== 401) {
      console.error('[API Error Detail]:', {
        status: error.response?.status,
        data: error.response?.data,
        error: apiError
      });
    }

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
    getCurrentUser: () =>
      axiosInstance.get<ApiResponse<User>>('/auth/me'),
  },
  users: {
    updateProfile: (data: { full_name: string }) =>
      axiosInstance.patch<User>('/users/me', data),
    updatePassword: (data: { old_password: string, new_password: string }) =>
      axiosInstance.post<{ message: string }>('/users/me/password', data),
  },
};

export default axiosInstance;
