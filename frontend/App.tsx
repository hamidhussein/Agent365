

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from './components/Header';
import Footer from './components/Footer';
import { lazyWithRetry, sanitizeInput } from '@/lib/utils';
import PageLoadingOverlay from './components/common/LoadingSpinner';
import { LoadingSpinner as SharedLoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { mockAgents } from './constants';
import axiosInstance from '@/lib/api/client';

const HomePage = lazyWithRetry(() => import('./components/pages/HomePage'));
const AgentsPage = lazyWithRetry(() => import('./components/pages/AgentsPage'));
const AgentDetailPage = lazyWithRetry(() => import('./components/pages/AgentDetailPage'));
const CreatorDashboardPage = lazyWithRetry(() => import('./components/pages/CreatorDashboardPage'));
const CreateAgentPage = lazyWithRetry(() => import('./components/pages/CreateAgentPage'));
const RunAgentPage = lazyWithRetry(() => import('./components/pages/RunAgentPage'));
const CreatorProfilePage = lazyWithRetry(() => import('./components/pages/CreatorProfilePage'));
const PricingPage = lazyWithRetry(() => import('./components/pages/PricingPage'));
const UserDashboardPage = lazyWithRetry(() => import('./components/pages/UserDashboardPage'));
const SearchPage = lazyWithRetry(() => import('./components/pages/SearchPage'));
const LoginPage = lazyWithRetry(() => import('./components/pages/LoginPage'));
const SignupPage = lazyWithRetry(() => import('./components/pages/SignupPage'));
const NotFoundPage = lazyWithRetry(() => import('./components/pages/NotFoundPage'));

export type Page =
  'home' |
  'marketplace' |
  'agentDetail' |
  'creatorDashboard' |
  'createAgent' |
  'runAgent' |
  'creatorProfile' |
  'pricing' |
  'dashboard' |
  'search' |
  'login' |
  'signup' |
  'notFound';

export type DashboardPage = 'overview' | 'runs' | 'favorites' | 'transactions' | 'settings';

import { mapBackendAgent, BackendAgent } from '@/lib/utils/agentMapper';

interface AgentsListResponse {
  data: BackendAgent[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const fetchAgents = async (): Promise<AgentsListResponse> => {
  const response = await axiosInstance.get<AgentsListResponse>('/agents', {
    params: { limit: 50 },
  });
  return response.data;
};



import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store';

// ... imports

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentDashboardPage, setCurrentDashboardPage] = useState<DashboardPage>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { fetchUserProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { data: agentsResponse, isLoading: isAgentsLoading, error: agentsError } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const fetchedAgents = useMemo(
    () => (agentsResponse?.data ?? []).map(mapBackendAgent),
    [agentsResponse]
  );
  const agents = fetchedAgents.length ? fetchedAgents : mockAgents;

  useEffect(() => {
    if (agentsError) {
      console.error('Unable to load agents from API:', agentsError);
    }
  }, [agentsError]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated, fetchUserProfile]);

  // Removed aggressive redirect from home to dashboard to allow users to visit landing page
  // useEffect(() => {
  //   if (isAuthenticated && user && (currentPage === 'home' || currentPage === 'login' || currentPage === 'signup')) {
  //     setCurrentPage('dashboard');
  //   }
  // }, [isAuthenticated, user, currentPage]);

  // Protected routes - redirect to login if not authenticated
  useEffect(() => {
    const protectedPages: Page[] = ['dashboard', 'creatorDashboard', 'createAgent'];
    if (!isAuthenticated && protectedPages.includes(currentPage)) {
      setCurrentPage('login');
    }
  }, [isAuthenticated, currentPage]);

  useEffect(() => {
    const agentExists = selectedAgentId
      ? agents.some((a) => a.id === selectedAgentId)
      : true;
    const creatorExists = selectedCreatorUsername
      ? agents.some((a) => a.creator.username === selectedCreatorUsername)
      : true;

    if ((currentPage === 'agentDetail' && selectedAgentId && !agentExists) ||
      (currentPage === 'runAgent' && selectedAgentId && !agentExists) ||
      (currentPage === 'creatorProfile' && selectedCreatorUsername && !creatorExists)) {
      navigateTo('notFound');
    }
  }, [currentPage, selectedAgentId, selectedCreatorUsername, agents]);


  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    navigateTo('agentDetail', undefined, agentId);
  };

  const handleRunAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    navigateTo('runAgent', undefined, agentId);
  };

  const handleSelectCreator = (username: string) => {
    setSelectedCreatorUsername(username);
    navigateTo('creatorProfile', undefined, undefined, username);
  }

  // URL Mapping
  const getPathFromPage = (page: Page, agentId?: string | null, username?: string | null, dashboardPage?: DashboardPage): string => {
    switch (page) {
      case 'home': return '/';
      case 'marketplace': return '/agents';
      case 'agentDetail': return agentId ? `/agents/${agentId}` : '/agents';
      case 'creatorDashboard': return '/creator/dashboard';
      case 'createAgent': return '/creator/new';
      case 'runAgent': return agentId ? `/agents/${agentId}/run` : '/agents';
      case 'creatorProfile': return username ? `/creator/${username}` : '/agents';
      case 'pricing': return '/pricing';
      case 'dashboard': return dashboardPage ? `/dashboard/${dashboardPage}` : '/dashboard';
      case 'search': return '/search';
      case 'login': return '/login';
      case 'signup': return '/signup';
      case 'notFound': return '/404';
      default: return '/';
    }
  };

  const getPageFromPath = (rawPath: string): { page: Page; agentId?: string; username?: string; dashboardPage?: DashboardPage } => {
    const path = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
    if (path === '/' || path === '') return { page: 'home' };
    if (path === '/agents') return { page: 'marketplace' };
    if (path.startsWith('/agents/') && path.endsWith('/run')) {
      const parts = path.split('/');
      return { page: 'runAgent', agentId: parts[2] };
    }
    if (path.startsWith('/agents/')) {
      const parts = path.split('/');
      return { page: 'agentDetail', agentId: parts[2] };
    }
    if (path === '/creator/dashboard') return { page: 'creatorDashboard' };
    if (path === '/creator/new') return { page: 'createAgent' };
    if (path.startsWith('/creator/')) {
      const parts = path.split('/');
      return { page: 'creatorProfile', username: parts[2] };
    }
    if (path === '/pricing') return { page: 'pricing' };
    if (path.startsWith('/dashboard')) {
      const parts = path.split('/');
      const dashboardPage = (parts[2] as DashboardPage) || 'overview';
      return { page: 'dashboard', dashboardPage };
    }
    if (path === '/search') return { page: 'search' };
    if (path === '/login') return { page: 'login' };
    if (path === '/signup') return { page: 'signup' };
    return { page: 'notFound' };
  };

  // Initialize state from URL
  useEffect(() => {
    const handlePopState = () => {
      const { page, agentId, username, dashboardPage } = getPageFromPath(window.location.pathname);
      setCurrentPage(page);
      if (agentId) setSelectedAgentId(agentId);
      if (username) setSelectedCreatorUsername(username);
      if (dashboardPage) setCurrentDashboardPage(dashboardPage);
    };

    // Initial load
    handlePopState();

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: Page, dashboardPage?: DashboardPage, agentId?: string, username?: string) => {
    setIsLoading(true);
    window.scrollTo(0, 0);

    // Update URL using overrides if provided, otherwise fall back to state (though state might be stale)
    // Best practice: Always pass the ID if we are navigating to a detail page.
    const path = getPathFromPage(page, agentId || selectedAgentId, username || selectedCreatorUsername, dashboardPage);
    window.history.pushState({}, '', path);

    setTimeout(() => {
      if (page !== 'agentDetail' && page !== 'runAgent' && page !== 'creatorProfile') {
        setSelectedAgentId(null);
        setSelectedCreatorUsername(null);
      }
      if (page !== 'search') {
        setSearchQuery('');
      }
      if (page === 'dashboard' && dashboardPage) {
        setCurrentDashboardPage(dashboardPage);
      } else if (page === 'dashboard') {
        setCurrentDashboardPage('overview');
      }
      setCurrentPage(page);
      setIsLoading(false);
    }, 300); // Simulate network latency for page load
  }

  const handleSearch = (query: string) => {
    setSearchQuery(sanitizeInput(query));
    navigateTo('search');
  };

  const handleBackToDetail = (agentId: string) => {
    setSelectedAgentId(agentId);
    navigateTo('agentDetail', undefined, agentId);
  };

  const toggleFavorite = async (agentId: string) => {
    if (!isAuthenticated) {
      navigateTo('login');
      return;
    }

    try {
      const response = await axiosInstance.post(`/users/me/favorites/${agentId}`);
      // The backend returns the updated user object directly (UserRead schema)
      // But axiosInstance interceptor might wrap it or return it as is.
      // Let's check client.ts. It returns axiosInstance.post<ApiResponse<User>>...
      // But the backend returns UserRead directly.
      // If the backend returns UserRead directly, it might not be wrapped in 'data' and 'success'.
      // However, FastAPI usually returns JSON.
      // Let's assume standard response for now.

      // Wait, I defined the endpoint to return UserRead.
      // So response.data will be the UserRead object.

      const updatedUser = response.data;

      // We need to map it to frontend User type
      const frontendUser: any = {
        ...updatedUser,
        name: updatedUser.full_name || updatedUser.username || 'User',
        credits: updatedUser.credits || 0,
        favoriteAgentIds: updatedUser.favoriteAgentIds || [],
      };

      useAuthStore.getState().updateUser(frontendUser);

      // Also update the local user variable if needed, but useAuthStore hook should handle it.
      // But 'user' here is from useAuthStore((state) => state.user), so it will update.

    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Optionally show toast error
    }
  };


  const renderPage = () => {
    const agent = agents.find((a) => a.id === selectedAgentId);
    const creator = agents.find((a) => a.creator.username === selectedCreatorUsername)?.creator;
    const creatorAgents = agents.filter((a) => a.creator.username === selectedCreatorUsername);
    const sharedAgentProps = {
      onSelectAgent: handleSelectAgent,
      onSelectCreator: handleSelectCreator,
      favoriteAgentIds: new Set(user?.favoriteAgentIds || []),
      onToggleFavorite: toggleFavorite,
    };
    const homePageProps = {
      agents,
      ...sharedAgentProps,
    };

    switch (currentPage) {
      case 'home':
        return <HomePage {...homePageProps} />;
      case 'marketplace':
        return <AgentsPage agents={agents} {...sharedAgentProps} />;
      case 'agentDetail':
        return agent ? <AgentDetailPage agent={agent} onRunAgent={handleRunAgent} onSelectCreator={handleSelectCreator} isFavorited={user?.favoriteAgentIds?.includes(agent.id) || false} onToggleFavorite={toggleFavorite} /> : null;
      case 'creatorDashboard':
        return <CreatorDashboardPage setCurrentPage={navigateTo} onSelectAgent={handleSelectAgent} />;
      case 'createAgent':
        return <CreateAgentPage setCurrentPage={navigateTo} />;
      case 'runAgent':
        return agent ? <RunAgentPage agent={agent} onBackToDetail={handleBackToDetail} /> : null;
      case 'creatorProfile':
        return (creator && creatorAgents.length > 0) ? <CreatorProfilePage creator={creator} agents={creatorAgents} onSelectAgent={handleSelectAgent} favoriteAgentIds={new Set(user?.favoriteAgentIds || [])} onToggleFavorite={toggleFavorite} /> : null;
      case 'pricing':
        return <PricingPage />;
      case 'dashboard':
        if (!user) return <LoginPage setCurrentPage={navigateTo} />;
        return <UserDashboardPage
          user={user}
          activePage={currentDashboardPage}
          setActivePage={(page: DashboardPage) => navigateTo('dashboard', page)}
          onSelectAgent={handleSelectAgent}
          onToggleFavorite={toggleFavorite}
          agents={agents}
        />;
      case 'search':
        return (
          <SearchPage
            query={searchQuery}
            allAgents={agents}
            {...sharedAgentProps}
          />
        );
      case 'login':
        return <LoginPage setCurrentPage={navigateTo} />;
      case 'signup':
        return <SignupPage setCurrentPage={navigateTo} />;
      case 'notFound':
        return <NotFoundPage onGoHome={() => navigateTo('home')} />;
      default:
        return <HomePage {...homePageProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans flex flex-col relative">
      {(isLoading || isAgentsLoading) && <PageLoadingOverlay />}
      <SkipToContent />
      <Header
        setCurrentPage={navigateTo}
        currentPage={currentPage}
        creditBalance={user?.credits || 0}
        onSearch={handleSearch}
      />
      <main id="main-content" className="flex-grow">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <SharedLoadingSpinner size="lg" />
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default App;
