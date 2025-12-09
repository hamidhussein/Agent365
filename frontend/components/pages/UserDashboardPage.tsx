// @ts-nocheck

import React from 'react';
import { User } from '@/lib/types';
import { Agent } from '../../types';
import UserDashboardSidebar from '../dashboard/UserDashboardSidebar';
import AgentGrid from '../AgentGrid';
import TransactionTable from '../dashboard/TransactionTable';
import { CreditIcon, HeartIcon, ZapIcon } from '../icons/Icons';
import { DashboardPage } from '../../App';
import { useQuery } from '@tanstack/react-query';
import { fetchUserExecutions, fetchUserTransactions } from '@/lib/api/dashboard';

interface UserDashboardPageProps {
    user: User;
    activePage: DashboardPage;
    setActivePage: (page: DashboardPage) => void;
    onSelectAgent: (agentId: string) => void;
    onToggleFavorite: (agentId: string) => void;
    agents: Agent[];
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
    const { data: executions = [] } = useQuery({
        queryKey: ['executions'],
        queryFn: () => fetchUserExecutions(0, 100), // Fetch count
    });

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => fetchUserTransactions(0, 5),
    });

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">Overview</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    icon={<CreditIcon className="h-6 w-6" />}
                    label="Credit Balance"
                    value={user.credits.toLocaleString()}
                    action={<button onClick={() => { }} className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90">Add Credits</button>}
                />
                <StatCard
                    icon={<ZapIcon className="h-6 w-6" />}
                    label="Total Runs"
                    value={executions.length.toString()}
                />
                <StatCard
                    icon={<HeartIcon className="h-6 w-6" />}
                    label="Favorites"
                    value={user.favoriteAgentIds.length.toString()}
                />
            </div>
            <div className="mt-10">
                <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
                    <button onClick={() => setActivePage('transactions')} className="text-sm font-medium text-brand-primary hover:underline">View All</button>
                </div>
                <div className="mt-4">
                    <TransactionTable transactions={transactions} />
                </div>
            </div>
        </div>
    )
};

const FavoritesContent: React.FC<{ user: User, agents: Agent[], onSelectAgent: (id: string) => void, onToggleFavorite: (id: string) => void }> = ({ user, agents, onSelectAgent, onToggleFavorite }) => {
    const favoriteAgents = agents.filter(agent => user.favoriteAgentIds.includes(agent.id));
    const placeholderSelectCreator = () => { };

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
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions', 'all'],
        queryFn: () => fetchUserTransactions(0, 100),
    });

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">Transaction History</h2>
            <div className="mt-6">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading transactions...</div>
                ) : (
                    <TransactionTable transactions={transactions} />
                )}
            </div>
        </div>
    )
};


const RunsHistoryContent: React.FC = () => {
    const { data: executions = [], isLoading } = useQuery({
        queryKey: ['executions', 'all'],
        queryFn: () => fetchUserExecutions(0, 100),
    });

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">Run History</h2>
            <div className="mt-6">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading run history...</div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-6">Date</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Agent</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Status</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Credits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {executions.length > 0 ? (
                                    executions.map((execution: any) => (
                                        <tr key={execution.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-400 sm:pl-6">
                                                {new Date(execution.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-white">
                                                {execution.agent?.name || 'Unknown Agent'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${execution.status === 'completed' ? 'bg-green-900 text-green-300' :
                                                        execution.status === 'failed' ? 'bg-red-900 text-red-300' :
                                                            'bg-yellow-900 text-yellow-300'
                                                    }`}>
                                                    {execution.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                                {execution.credits_used}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                                            No runs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ user, activePage, setActivePage, onSelectAgent, onToggleFavorite, agents }) => {

    const renderContent = () => {
        switch (activePage) {
            case 'overview':
                return <OverviewContent user={user} setActivePage={setActivePage} />;
            case 'favorites':
                return <FavoritesContent user={user} agents={agents} onSelectAgent={onSelectAgent} onToggleFavorite={onToggleFavorite} />;
            case 'transactions':
                return <TransactionsContent />;
            case 'runs':
                return <RunsHistoryContent />;
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
