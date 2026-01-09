
import React, { useState } from 'react';
import { BotIcon, SearchIcon, CreditIcon, MenuIcon, XIcon } from './icons/Icons';
import { Page } from '../App';
import { useAuthStore } from '@/lib/store';
import { useAuth } from '@/lib/hooks/useAuth';

interface HeaderProps {
  setCurrentPage: (page: Page) => void;
  currentPage: Page;
  creditBalance: number;
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setCurrentPage, currentPage, creditBalance, onSearch }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { user, isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();

  const handleNavigation = (page: Page) => {
    setMobileMenuOpen(false);
    const requiresAuth = page === 'dashboard' || page === 'creatorStudio';
    if (requiresAuth && !isAuthenticated) {
      setCurrentPage('login');
      return;
    }
    if (currentPage === 'createAgent' && page !== 'createAgent') {
      if (confirm('Are you sure you want to exit? Any unsaved changes will be lost.')) {
        setCurrentPage(page);
      }
    } else {
      setCurrentPage(page);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      setSearchInput('');
      setMobileMenuOpen(false);
    }
  }

  const navLinks = [
    { page: 'marketplace', label: 'Marketplace' },
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'creatorStudio', label: 'Creator Studio' },
    ...(user?.role === 'admin' ? [{ page: 'adminSettings', label: 'Settings' }] : []),
    { page: 'pricing', label: 'Pricing' },
  ] as const;


  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-gray-900/50 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <button onClick={() => handleNavigation('home')} className="flex items-center space-x-3">
          <BotIcon className="h-7 w-7 text-brand-primary" />
          <span className="text-xl font-bold">AgentGrid</span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden items-center space-x-6 text-sm font-medium text-gray-300 md:flex">
          {navLinks.map(link => (
            <button
              key={link.page}
              onClick={() => handleNavigation(link.page as Page)}
              className={`transition-colors hover:text-white ${
                currentPage === link.page ? 'text-brand-primary' : ''
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 pl-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </form>
          <button onClick={() => handleNavigation('pricing')} className="hidden sm:flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            <CreditIcon className="h-4 w-4 text-green-400" />
            <span>{creditBalance.toLocaleString()}</span>
          </button>

          {/* Desktop Auth Buttons - Conditional */}
          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => handleNavigation('dashboard')}
                className="hidden sm:flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
              >
                <span className="max-w-[100px] truncate">{user.full_name || user.username}</span>
              </button>
              <button
                onClick={signOut}
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleNavigation('login')} className="hidden sm:inline-flex h-9 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                Log In
              </button>
              <button onClick={() => handleNavigation('signup')} className="hidden sm:inline-flex h-9 items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900">
                Sign Up
              </button>
            </>
          )}

          <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="p-2 md:hidden text-gray-300 hover:text-white">
            {isMobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-gray-900 border-b border-gray-700 shadow-lg">
          <div className="flex flex-col space-y-1 px-4 pt-2 pb-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full mb-3 lg:hidden">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 pl-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </form>
            {navLinks.map(link => (
              <button key={link.page} onClick={() => handleNavigation(link.page as Page)} className="text-left rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white">{link.label}</button>
            ))}
            <div className="border-t border-gray-700 pt-4 mt-4 flex flex-col space-y-3">
              {/* Mobile Auth Buttons - Conditional */}
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => handleNavigation('dashboard')}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
                  >
                    {user.full_name || user.username}
                  </button>
                  <button
                    onClick={signOut}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleNavigation('login')} className="inline-flex h-10 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    Log In
                  </button>
                  <button onClick={() => handleNavigation('signup')} className="inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900">
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
