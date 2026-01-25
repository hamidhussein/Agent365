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
        const payload = response.data;
        const frontendUser: any = {
          ...payload.user,
          name: payload.user.full_name || payload.user.username || 'User',
          creditBalance: payload.user.credits || 0,
          favoriteAgentIds: Array.isArray(payload.user.favoriteAgentIds)
            ? payload.user.favoriteAgentIds
            : [],
        };
        login(frontendUser);
        if (payload.access_token) {
          localStorage.setItem('auth_token', payload.access_token);
        }
        // Auth state will trigger App.tsx useEffect to redirect
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
        // Explicitly construct payload with only the fields backend expects
        const signupPayload: any = {
          email: data.email,
          username: data.username,
          password: data.password,
        };

        console.log('[DEBUG] Attempting signup with payload:', { ...signupPayload, password: '***' });
        const response = await api.auth.signup(signupPayload);
        const payload = response.data;
        const frontendUser: any = {
          ...payload.user,
          name: payload.user.full_name || payload.user.username || 'User',
          creditBalance: payload.user.credits || 0,
          favoriteAgentIds: Array.isArray(payload.user.favoriteAgentIds)
            ? payload.user.favoriteAgentIds
            : [],
        };
        login(frontendUser);
        if (payload.access_token) {
          localStorage.setItem('auth_token', payload.access_token);
        }
        // Auth state will trigger App.tsx useEffect to redirect
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

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.auth.getCurrentUser();
      const raw = (response.data as any) ?? {};
      const payload = raw.data ?? raw; // handle both wrapped and unwrapped responses
      if (!payload) {
        throw new Error('Empty user profile payload');
      }
      const frontendUser: any = {
        ...payload,
        name: payload.full_name || payload.username || payload.email || 'User',
        credits: payload.credits || 0,
        favoriteAgentIds: (payload as any).favoriteAgentIds || [],
      };
      login(frontendUser);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }, [login]);

  return {
    user,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    requireAuth,
    fetchUserProfile,
  };
}
