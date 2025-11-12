

import React, { Suspense, useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { lazyWithRetry, sanitizeInput } from '@/lib/utils';
import PageLoadingOverlay from './components/common/LoadingSpinner';
import { LoadingSpinner as SharedLoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { mockAgents, mockUser } from './constants';
import { User } from './types';

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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentDashboardPage, setCurrentDashboardPage] = useState<DashboardPage>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User>(mockUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const agentExists = mockAgents.some(a => a.id === selectedAgentId);
    const creatorExists = mockAgents.some(a => a.creator.username === selectedCreatorUsername);

    if ((currentPage === 'agentDetail' && selectedAgentId && !agentExists) ||
        (currentPage === 'runAgent' && selectedAgentId && !agentExists) ||
        (currentPage === 'creatorProfile' && selectedCreatorUsername && !creatorExists)) {
      navigateTo('notFound');
    }
  }, [currentPage, selectedAgentId, selectedCreatorUsername]);


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
    const agent = mockAgents.find(a => a.id === selectedAgentId);
    const creator = mockAgents.find(a => a.creator.username === selectedCreatorUsername)?.creator;
    const creatorAgents = mockAgents.filter(a => a.creator.username === selectedCreatorUsername);
    const homePageProps = {
      onSelectAgent: handleSelectAgent,
      onSelectCreator: handleSelectCreator,
      favoriteAgentIds: user.favoriteAgentIds,
      onToggleFavorite: toggleFavorite
    };

    switch (currentPage) {
      case 'home':
        return <HomePage {...homePageProps} />;
      case 'marketplace':
        return <AgentsPage {...homePageProps} />;
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
        return <SearchPage query={searchQuery} allAgents={mockAgents} {...homePageProps} />;
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
      {isLoading && <PageLoadingOverlay />}
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
