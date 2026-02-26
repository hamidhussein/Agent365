import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store';
import { getAuthToken } from '@/lib/auth/tokenStore';

const LoginPage = React.lazy(() => import('./components/pages/LoginPage'));
const SignupPage = React.lazy(() => import('./components/pages/SignupPage'));
const CreatorStudioPage = React.lazy(() => import('./creator-studio'));
const NotFoundPage = React.lazy(() => import('./components/pages/NotFoundPage'));
const SharedAgentChatPage = React.lazy(() => import('./components/pages/SharedAgentChatPage'));

export type Page =
  | 'login'
  | 'signup'
  | 'creatorStudio'
  | 'studioAdmin'
  | 'sharedAgent'
  | 'notFound';

type RouteState = {
  page: Page;
  next?: string;
  agentId?: string;
  shareToken?: string;
};

const getRouteFromLocation = (): RouteState => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || undefined;

  if (path === '/') return { page: 'login', next };
  if (path === '/login') return { page: 'login', next };
  if (path === '/signup') return { page: 'signup', next };
  if (path === '/studio/admin') return { page: 'studioAdmin', next };
  if (path.startsWith('/studio')) return { page: 'creatorStudio', next };
  
  // Shared agent route
  if (path.startsWith('/share/')) {
    const parts = path.split('/');
    if (parts.length >= 3 && parts[2]) {
      return { page: 'sharedAgent', shareToken: parts[2], next };
    }
  }

  return { page: 'notFound' };
};

const pathForPage = (page: Page): string => {
  switch (page) {
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'creatorStudio':
      return '/studio';
    case 'studioAdmin':
      return '/studio/admin';
    case 'sharedAgent':
      return '/share';
    case 'notFound':
      return '/404';
    default:
      return '/login';
  }
};

const App: React.FC = () => {
  const [route, setRoute] = useState<RouteState>({ page: 'login' });
  const [authReady, setAuthReady] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authUser = useAuthStore((state) => state.user);
  const { fetchUserProfile } = useAuth();

  const safeNextPath = useMemo(() => {
    if (!route.next) return null;
    if (!route.next.startsWith('/')) return null;
    if (route.next.startsWith('//')) return null;
    return route.next;
  }, [route.next]);

  const navigateToPath = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    setRoute(getRouteFromLocation());
    window.scrollTo(0, 0);
  };

  const navigateTo = (page: Page) => {
    navigateToPath(pathForPage(page));
  };

  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromLocation());
    setRoute(getRouteFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        await fetchUserProfile();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    void restoreAuth();
    return () => {
      cancelled = true;
    };
  }, [fetchUserProfile]);

  useEffect(() => {
    if (isAuthenticated && !authUser) {
      fetchUserProfile();
    }
  }, [isAuthenticated, authUser, fetchUserProfile]);

  useEffect(() => {
    if (!authReady) return;
    const path = window.location.pathname;
    const requiresAuth = path.startsWith('/studio');
    if (!requiresAuth || isAuthenticated) return;
    navigateToPath(`/login?next=${encodeURIComponent(path)}`, true);
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) return;
    if (route.page === 'login' || route.page === 'signup') {
      if (safeNextPath) {
        navigateToPath(safeNextPath, true);
      } else {
        navigateToPath('/studio', true);
      }
    }
  }, [authReady, isAuthenticated, route.page, safeNextPath]);

  useEffect(() => {
    if (route.page !== 'studioAdmin') return;
    if (!isAuthenticated) return;
    if (authUser && authUser.role !== 'admin') {
      navigateToPath('/studio', true);
    }
  }, [route.page, isAuthenticated, authUser]);

  const handleAuthSuccess = () => {
    if (safeNextPath) {
      navigateToPath(safeNextPath, true);
      return;
    }
    navigateTo('creatorStudio');
  };

  const renderPage = () => {
    const routeNeedsAuth = route.page === 'creatorStudio' || route.page === 'studioAdmin';
    if (!authReady && routeNeedsAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (route.page) {
      case 'login':
        return <LoginPage setCurrentPage={() => handleAuthSuccess()} />;
      case 'signup':
        return <SignupPage setCurrentPage={() => handleAuthSuccess()} />;
      case 'creatorStudio':
        return <CreatorStudioPage />;
      case 'studioAdmin':
        return <CreatorStudioPage initialView="admin-dashboard" />;
      case 'sharedAgent':
        if (route.shareToken) {
          return <SharedAgentChatPage shareToken={route.shareToken} />;
        }
        return <NotFoundPage onGoHome={() => navigateTo('login')} />;
      case 'notFound':
      default:
        return <NotFoundPage onGoHome={() => navigateTo('login')} />;
    }
  };

  return (
    <ToastProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="min-h-screen bg-background text-foreground">
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </div>
      </ThemeProvider>
    </ToastProvider>
  );
};

export default App;
