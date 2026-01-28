
import React from 'react';
import { DashboardPage } from '../../App';
import { EyeIcon, HeartIcon, ZapIcon, CreditIcon, UsersIcon } from '../icons/Icons';
import { MessageSquare } from 'lucide-react';

interface UserDashboardSidebarProps {
    activePage: DashboardPage;
    setActivePage: (page: DashboardPage) => void;
}

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: <EyeIcon className="h-5 w-5" /> },
    { id: 'runs', label: 'Run History', icon: <ZapIcon className="h-5 w-5" /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'favorites', label: 'Favorites', icon: <HeartIcon className="h-5 w-5" /> },
    { id: 'transactions', label: 'Transactions', icon: <CreditIcon className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <UsersIcon className="h-5 w-5" /> },
];

const UserDashboardSidebar: React.FC<UserDashboardSidebarProps> = ({ activePage, setActivePage }) => {
    return (
        <nav className="flex flex-col space-y-1 sticky top-24">
            {NAV_ITEMS.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActivePage(item.id as DashboardPage)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activePage === item.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

export default UserDashboardSidebar;
