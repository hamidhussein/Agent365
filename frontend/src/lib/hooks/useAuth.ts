import { useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api/client';
import type {
  LoginFormData,
  SignupFormData,
} from '@/lib/schemas/auth.schema';

type AuthActionResult = {
  success: boolean;
  error?: string;
};

const redirectTo = (path: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
};

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const signIn = useCallback(
    async (credentials: LoginFormData): Promise<AuthActionResult> => {
      try {
        const response = await api.auth.login(credentials);
        const payload = response.data.data;
        login(payload.user);
        if (payload.token) {
          localStorage.setItem('auth_token', payload.token);
        }
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || 'Unable to sign in. Please try again.',
        };
      }
    },
    [login]
  );

  const signUp = useCallback(
    async (data: SignupFormData): Promise<AuthActionResult> => {
      try {
        const response = await api.auth.signup(data);
        const payload = response.data.data;
        login(payload.user);
        if (payload.token) {
          localStorage.setItem('auth_token', payload.token);
        }
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || 'Unable to sign up. Please try again.',
        };
      }
    },
    [login]
  );

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.warn('Logout failed, clearing local session anyway.', error);
    } finally {
      logout();
      localStorage.removeItem('auth_token');
      redirectTo('/');
    }
  }, [logout]);

  const requireAuth = useCallback(
    (redirectUrl = '/login') => {
      if (!isAuthenticated) {
        redirectTo(redirectUrl);
        return false;
      }
      return true;
    },
    [isAuthenticated]
  );

  return {
    user,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    requireAuth,
  };
}
