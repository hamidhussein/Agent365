

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from './components/Header';
import Footer from './components/Footer';
import { lazyWithRetry, sanitizeInput } from '@/lib/utils';
import PageLoadingOverlay from './components/common/LoadingSpinner';
import { LoadingSpinner as SharedLoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { mockAgents, mockUser } from './constants';
import { User, Agent } from './types';
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
  'dashboard'|
  'search' |
  'login' |
  'signup' |
  'notFound';

export type DashboardPage = 'overview' | 'runs' | 'favorites' | 'transactions' | 'settings';

type BackendAgent = {
  id: string;
  name: string;
  description: string;
  long_description?: string | null;
  category: string;
  tags: string[];
  price_per_run: number;
  rating: number;
  total_runs: number;
  total_reviews: number;
  status: string;
  config?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_seconds?: number;
    required_inputs?: Array<Record<string, unknown>>;
    output_schema?: Record<string, unknown>;
  };
  capabilities?: string[];
  limitations?: string[];
  demo_available?: boolean;
  version: string;
  thumbnail_url?: string | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
};

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

const createPlaceholderCreator = (id: string) => {
  const shortId = id?.slice(0, 6) ?? 'creator';
  return {
    name: `Creator ${shortId}`,
    username: id ?? shortId,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${shortId}`,
    bio: 'Creator profile coming soon.',
  };
};

const mapBackendAgent = (agent: BackendAgent): Agent => {
  const placeholderImage = `https://placehold.co/600x400/111827/FFFFFF/png?text=${encodeURIComponent(agent.name?.[0] ?? 'A')}`;
  const successRate =
    agent.total_runs > 0
      ? Math.min(99, Math.max(70, Math.round((agent.rating ?? 0) * 18)))
      : 95;

  const statusMap: Record<string, Agent['status']> = {
    active: 'Live',
    inactive: 'Paused',
  };

  return {
    id: agent.id,
    name: agent.name,
    creator: createPlaceholderCreator(agent.creator_id ?? agent.id),
    description: agent.description,
    longDescription: agent.long_description ?? agent.description,
    category: agent.category ?? 'General',
    rating: agent.rating ?? 0,
    reviewCount: agent.total_reviews ?? 0,
    runs: agent.total_runs ?? 0,
    imageUrl: agent.thumbnail_url ?? placeholderImage,
    tags: Array.isArray(agent.tags) ? agent.tags : [],
    price: agent.price_per_run ?? 0,
    successRate,
    avgRunTime: agent.config?.timeout_seconds ?? 60,
    status: statusMap[agent.status] ?? 'Draft',
    inputSchema: [],
    mockResult: 'Run results will appear here.',
    reviews: [],
  };
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentDashboardPage, setCurrentDashboardPage] = useState<DashboardPage>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User>(mockUser);
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
    navigateTo('agentDetail');
  };

  const handleRunAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    navigateTo('runAgent');
  };

  const handleSelectCreator = (username: string) => {
    setSelectedCreatorUsername(username);
    navigateTo('creatorProfile');
  }
  
  const navigateTo = (page: Page, dashboardPage?: DashboardPage) => {
    setIsLoading(true);
    window.scrollTo(0, 0);

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
      navigateTo('agentDetail');
  };

  const toggleFavorite = (agentId: string) => {
    setUser(prevUser => {
      const newFavorites = new Set(prevUser.favoriteAgentIds);
      if (newFavorites.has(agentId)) {
        newFavorites.delete(agentId);
      } else {
        newFavorites.add(agentId);
      }
      return { ...prevUser, favoriteAgentIds: newFavorites };
    });
  };


  const renderPage = () => {
    const agent = agents.find((a) => a.id === selectedAgentId);
    const creator = agents.find((a) => a.creator.username === selectedCreatorUsername)?.creator;
    const creatorAgents = agents.filter((a) => a.creator.username === selectedCreatorUsername);
    const sharedAgentProps = {
      onSelectAgent: handleSelectAgent,
      onSelectCreator: handleSelectCreator,
      favoriteAgentIds: user.favoriteAgentIds,
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
        return agent ? <AgentDetailPage agent={agent} onRunAgent={handleRunAgent} onSelectCreator={handleSelectCreator} isFavorited={user.favoriteAgentIds.has(agent.id)} onToggleFavorite={toggleFavorite} /> : null;
      case 'creatorDashboard':
        return <CreatorDashboardPage setCurrentPage={navigateTo} onSelectAgent={handleSelectAgent} />;
      case 'createAgent':
        return <CreateAgentPage setCurrentPage={navigateTo} />;
      case 'runAgent':
        return agent ? <RunAgentPage agent={agent} onBackToDetail={handleBackToDetail} /> : null;
      case 'creatorProfile':
        return (creator && creatorAgents.length > 0) ? <CreatorProfilePage creator={creator} agents={creatorAgents} onSelectAgent={handleSelectAgent} favoriteAgentIds={user.favoriteAgentIds} onToggleFavorite={toggleFavorite} /> : null;
      case 'pricing':
        return <PricingPage />;
      case 'dashboard':
        return <UserDashboardPage 
                  user={user}
                  activePage={currentDashboardPage}
                  setActivePage={(page: DashboardPage) => navigateTo('dashboard', page)}
                  onSelectAgent={handleSelectAgent}
                  onToggleFavorite={toggleFavorite}
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
        creditBalance={user.creditBalance}
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
