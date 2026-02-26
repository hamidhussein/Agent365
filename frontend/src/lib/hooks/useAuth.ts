import { useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api/client';
import { clearAuthToken, setAuthToken } from '@/lib/auth/tokenStore';
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
        };
        login(frontendUser);
        if (payload.access_token) {
          setAuthToken(payload.access_token);
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
        };
        login(frontendUser);
        if (payload.access_token) {
          setAuthToken(payload.access_token);
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
    clearAuthToken();
    logout();
    redirectTo('/login');
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
      };
      login(frontendUser);
      return { success: true } as AuthActionResult;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      clearAuthToken();
      logout();
      return {
        success: false,
        error: 'Session expired. Please sign in again.',
      } as AuthActionResult;
    }
  }, [login, logout]);

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
