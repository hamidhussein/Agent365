
import React from 'react';
import { User, Agent } from '../../types';
import { mockAgents, mockTransactions } from '../../constants';
import UserDashboardSidebar from '../dashboard/UserDashboardSidebar';
import AgentGrid from '../AgentGrid';
import TransactionTable from '../dashboard/TransactionTable';
import { CreditIcon, HeartIcon, ZapIcon } from '../icons/Icons';
import { DashboardPage } from '../../App';

interface UserDashboardPageProps {
    user: User;
    activePage: DashboardPage;
    setActivePage: (page: DashboardPage) => void;
    onSelectAgent: (agentId: string) => void;
    onToggleFavorite: (agentId: string) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }> = ({ icon, label, value, action }) => (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-start justify-between">
            <div>
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-gray-400">{icon}</div>
                    <p className="text-sm text-gray-400">{label}</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    </div>
);


const OverviewContent: React.FC<{ user: User, setActivePage: (page: DashboardPage) => void }> = ({ user, setActivePage }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-white">Overview</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    icon={<CreditIcon className="h-6 w-6"/>} 
                    label="Credit Balance" 
                    value={user.creditBalance.toLocaleString()}
                    action={<button onClick={() => {}} className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90">Add Credits</button>}
                />
                 <StatCard 
                    icon={<ZapIcon className="h-6 w-6"/>} 
                    label="Total Runs" 
                    value={"12"} // Mock data
                />
                 <StatCard 
                    icon={<HeartIcon className="h-6 w-6"/>} 
                    label="Favorites" 
                    value={user.favoriteAgentIds.size.toString()}
                />
            </div>
            <div className="mt-10">
                <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
                    <button onClick={() => setActivePage('transactions')} className="text-sm font-medium text-brand-primary hover:underline">View All</button>
                </div>
                <div className="mt-4">
                    <TransactionTable transactions={mockTransactions.slice(0, 5)} />
                </div>
            </div>
        </div>
    )
};

const FavoritesContent: React.FC<{ user: User, onSelectAgent: (id: string) => void, onToggleFavorite: (id: string) => void }> = ({ user, onSelectAgent, onToggleFavorite }) => {
    const favoriteAgents = mockAgents.filter(agent => user.favoriteAgentIds.has(agent.id));
    const placeholderSelectCreator = () => {};

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">My Favorites ({favoriteAgents.length})</h2>
            <div className="mt-6">
                {favoriteAgents.length > 0 ? (
                    <AgentGrid 
                        agents={favoriteAgents} 
                        onSelectAgent={onSelectAgent} 
                        onSelectCreator={placeholderSelectCreator} 
                        favoriteAgentIds={user.favoriteAgentIds} 
                        onToggleFavorite={onToggleFavorite} 
                    />
                ) : (
                    <div className="text-center py-16 rounded-lg border-2 border-dashed border-gray-700">
                        <h3 className="text-lg font-semibold text-white">No Favorited Agents</h3>
                        <p className="mt-1 text-sm text-gray-400">Click the heart icon on an agent to save it here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TransactionsContent: React.FC = () => {
    return (
         <div>
            <h2 className="text-2xl font-bold text-white">Transaction History</h2>
            <div className="mt-6">
                <TransactionTable transactions={mockTransactions} />
            </div>
        </div>
    )
};


const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ user, activePage, setActivePage, onSelectAgent, onToggleFavorite }) => {

    const renderContent = () => {
        switch(activePage) {
            case 'overview':
                return <OverviewContent user={user} setActivePage={setActivePage} />;
            case 'favorites':
                return <FavoritesContent user={user} onSelectAgent={onSelectAgent} onToggleFavorite={onToggleFavorite} />;
            case 'transactions':
                return <TransactionsContent />;
            // Add other cases for 'runs', 'settings' etc.
            default:
                return <OverviewContent user={user} setActivePage={setActivePage} />;
        }
    }

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">My Dashboard</h1>
                <p className="mt-2 text-lg text-gray-400">Welcome back, {user.name}.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                <aside className="lg:col-span-1">
                    <UserDashboardSidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="lg:col-span-3">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default UserDashboardPage;
