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
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api/client';
import ReviewRequestModal from '../reviews/ReviewRequestModal';
import { mapBackendAgent } from '@/lib/utils/agentMapper';
import ReviewsPage from './ReviewsPage';

interface UserDashboardPageProps {
    user: User;
    activePage: DashboardPage;
    setActivePage: (page: DashboardPage) => void;
    onSelectAgent: (agentId: string) => void;
    onToggleFavorite: (agentId: string) => void;
    agents: Agent[];
    onAddCredits?: () => void;
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


const OverviewContent: React.FC<{ user: User, setActivePage: (page: DashboardPage) => void, onAddCredits?: () => void }> = ({ user, setActivePage, onAddCredits }) => {
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
                    action={<button onClick={() => onAddCredits ? onAddCredits() : setActivePage("settings")} className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90">Add Credits</button>}
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
                {executions.filter((e: any) => e.review_status === 'pending').length > 0 && (
                     <StatCard
                        icon={<MessageSquare className="h-6 w-6" />}
                        label="Pending Reviews"
                        value={executions.filter((e: any) => e.review_status === 'pending').length.toString()}
                         action={<button onClick={() => setActivePage('runs')} className="text-xs text-brand-primary hover:text-brand-primary/80">View Runs</button>}
                    />
                )}
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

const FavoritesContent: React.FC<{ user: User, onSelectAgent: (id: string) => void, onToggleFavorite: (id: string) => void }> = ({ user, onSelectAgent, onToggleFavorite }) => {
    const { data: favoritesResponse, isLoading } = useQuery({
        queryKey: ['favorites', user.id],
        queryFn: () => api.agents.list({ favorited_by: user.id, source: 'all', include_creator_studio_public: true }),
    });

    const favoriteAgents = React.useMemo(() => 
        (favoritesResponse?.data.data ?? []).map(mapBackendAgent),
        [favoritesResponse]
    );

    const placeholderSelectCreator = () => { };

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">My Favorites ({favoriteAgents.length})</h2>
            <div className="mt-6">
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                        <p className="mt-2 text-gray-400">Loading favorites...</p>
                    </div>
                ) : favoriteAgents.length > 0 ? (
                    <AgentGrid
                        agents={favoriteAgents}
                        onSelectAgent={onSelectAgent}
                        onSelectCreator={placeholderSelectCreator}
                        favoriteAgentIds={new Set(user.favoriteAgentIds)}
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

const SettingsContent: React.FC<{ user: User }> = ({ user }) => {
    const { showToast } = useToast();
    const [fullName, setFullName] = React.useState(user.full_name || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

    const [oldPassword, setOldPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

    const handleUpdateProfile = async () => {
        setIsUpdatingProfile(true);
        try {
            await api.users.updateProfile({ full_name: fullName });
            showToast('Profile updated successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await api.users.updatePassword({ 
                old_password: oldPassword, 
                new_password: newPassword 
            });
            showToast('Password updated successfully', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showToast(error.message || 'Failed to update password', 'error');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            
            {/* Profile Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 max-w-2xl">
                <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Username</label>
                            <p className="mt-1 text-white font-medium bg-gray-900/50 px-3 py-2 rounded border border-gray-800">{user.username}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Email Address</label>
                            <p className="mt-1 text-white font-medium bg-gray-900/50 px-3 py-2 rounded border border-gray-800">{user.email}</p>
                        </div>
                    </div>
                    
                    <div className="max-w-md">
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-400">Full Name</label>
                        <input
                            type="text"
                            id="full_name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                            placeholder="Enter your full name"
                        />
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <button 
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdatingProfile ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : 'Update Profile'}
                    </button>
                </div>
            </div>

            {/* Password Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 max-w-2xl">
                <h3 className="text-lg font-semibold text-white mb-6">Change Password</h3>
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Current Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                        />
                        <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters with letters and numbers.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                        />
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <button 
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword}
                        className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdatingPassword ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Updating...
                            </>
                        ) : 'Update Password'}
                    </button>
                </div>
            </div>

            {/* Account Details (Read Only) */}
            <div className="bg-gray-800/10 border border-gray-800 rounded-lg p-6 max-w-2xl">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Account Type</label>
                        <span className="mt-1 inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300 uppercase">
                            {user.role}
                        </span>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Member Since</label>
                        <p className="mt-1 text-sm text-gray-400 font-medium">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase">User ID</label>
                        <p className="mt-1 text-[10px] text-gray-600 font-mono truncate" title={user.id}>{user.id}</p>
                    </div>
                </div>
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


const ExecutionDetailsModal: React.FC<{ execution: any; onClose: () => void }> = ({ execution, onClose }) => {
    const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
    const [localReviewStatus, setLocalReviewStatus] = React.useState(execution.review_status || 'none');
    const { showToast } = useToast();

    if (!execution) return null;

    const handleRequestReview = async (note: string) => {
        try {
            await api.executions.requestReview(execution.id, note);
            setLocalReviewStatus('pending');
            // Update execution object in place for UI feedback
            execution.review_status = 'pending';
            execution.review_request_note = note;
        } catch (error: any) {
            throw error; // Let the modal handle it
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Execution Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400">Agent</p>
                            <p className="text-white font-medium">{execution.agent?.name || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Date</p>
                            <p className="text-white font-medium">{new Date(execution.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Status</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                execution.status === 'completed' ? 'bg-green-900 text-green-300' :
                                execution.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
                            }`}>
                                {execution.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-400">Review Status</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                execution.review_status === 'completed' ? 'bg-blue-900 text-blue-300' :
                                execution.review_status === 'pending' ? 'bg-amber-900 text-amber-300' : 'bg-gray-700 text-gray-400'
                            }`}>
                                {execution.review_status || 'none'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Inputs</h3>
                        <div className="bg-gray-800 rounded-md p-3 text-xs">
                            <pre className="text-gray-300 whitespace-pre-wrap">{JSON.stringify(execution.inputs, null, 2)}</pre>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Outputs</h3>
                        <div className="bg-gray-800 rounded-md p-3 text-xs">
                            <pre className="text-gray-300 whitespace-pre-wrap">{JSON.stringify(execution.outputs, null, 2)}</pre>
                        </div>
                    </div>

                    {execution.review_status !== 'none' && (
                        <div className="border-t border-gray-700 pt-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-brand-primary" />
                                <h3 className="text-lg font-semibold text-white">Expert Review</h3>
                            </div>
                            
                            <div className="bg-amber-900/10 border border-amber-800 rounded-lg p-4">
                                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Your Request</p>
                                <p className="text-sm text-gray-300">{execution.review_request_note || 'No note provided'}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Requested on {new Date(execution.created_at).toLocaleDateString()} at {new Date(execution.created_at).toLocaleTimeString()}
                                </p>
                            </div>

                            {execution.review_status === 'completed' && execution.review_response_note && (
                                <div className="bg-blue-900/10 border border-blue-800 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Creator's Response</p>
                                    <p className="text-sm text-gray-100 leading-relaxed">{execution.review_response_note}</p>
                                    {execution.reviewed_at && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Responded on {new Date(execution.reviewed_at).toLocaleDateString()} at {new Date(execution.reviewed_at).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {execution.review_status === 'pending' && (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                                    <div className="inline-flex items-center gap-2 text-amber-400">
                                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium">Waiting for creator response...</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">You'll be notified when the creator responds</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-gray-700 flex justify-between items-center">
                    <div className="flex gap-2">
                        {execution.status === 'completed' && (localReviewStatus === 'none' || localReviewStatus === 'rejected') && (
                            <button 
                                onClick={() => setIsReviewModalOpen(true)}
                                className="px-4 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/30 rounded hover:bg-brand-primary/20 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Request Expert Review
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">Close</button>
                </div>
                
                <ReviewRequestModal 
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    onSubmit={handleRequestReview}
                    agentName={execution.agent?.name || 'Unknown Agent'}
                    reviewCost={execution.agent?.review_cost}
                />
            </div>
        </div>
    );
};


const RunsHistoryContent: React.FC = () => {
    const [selectedExecution, setSelectedExecution] = React.useState<any>(null);
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
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Review</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Credits</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {executions.length > 0 ? (
                                    executions.map((execution: any) => (
                                        <tr key={execution.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setSelectedExecution(execution)}>
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
                                                {execution.review_status && execution.review_status !== 'none' ? (
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                                        execution.review_status === 'completed' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
                                                    }`}>
                                                        {execution.review_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                                {execution.credits_used}
                                            </td>
                                            <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button className="text-brand-primary hover:text-brand-primary/80">View</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                                            No runs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {selectedExecution && <ExecutionDetailsModal execution={selectedExecution} onClose={() => setSelectedExecution(null)} />}
        </div>
    );
};

const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ user, activePage, setActivePage, onSelectAgent, onToggleFavorite, agents, onAddCredits }) => {

    const renderContent = () => {
        switch (activePage) {
            case 'overview':
                return <OverviewContent user={user} setActivePage={setActivePage} onAddCredits={onAddCredits} />;
            case 'favorites':
                return <FavoritesContent user={user} onSelectAgent={onSelectAgent} onToggleFavorite={onToggleFavorite} />;
            case 'transactions':
                return <TransactionsContent />;
            case 'runs':
                return <RunsHistoryContent />;
            case 'settings':
                return <SettingsContent user={user} />;
            case 'reviews':
                return <ReviewsPage />;
            default:
                return <OverviewContent user={user} setActivePage={setActivePage} onAddCredits={onAddCredits} />;
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
