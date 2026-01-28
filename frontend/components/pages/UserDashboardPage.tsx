import React from 'react';
import { User, Agent, AgentExecution } from '@/lib/types';
import UserDashboardSidebar from '../dashboard/UserDashboardSidebar';
import AgentGrid from '../AgentGrid';
import TransactionTable from '../dashboard/TransactionTable';
import { CreditIcon, HeartIcon, ZapIcon } from '../icons/Icons';
import { DashboardPage } from '../../App';
import { useQuery } from '@tanstack/react-query';
import { fetchUserExecutions, fetchUserTransactions } from '@/lib/api/dashboard';
import { MessageSquare, Sparkles, CheckCircle } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client';
import ReviewRequestModal from '../reviews/ReviewRequestModal';
import { mapBackendAgent } from '@/lib/utils/agentMapper';
import UserReviewsPage from './UserReviewsPage';

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
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
            <div>
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
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
            <h2 className="text-2xl font-bold text-foreground">Overview</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    icon={<CreditIcon className="h-6 w-6" />}
                    label="Credit Balance"
                    value={user.credits.toLocaleString()}
                    action={<button onClick={() => onAddCredits ? onAddCredits() : setActivePage("settings")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Add Credits</button>}
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
                    <h3 className="text-xl font-semibold text-foreground">Recent Transactions</h3>
                    <button onClick={() => setActivePage('transactions')} className="text-sm font-medium text-primary hover:underline">View All</button>
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
        (favoritesResponse?.data.data ?? []).map(mapBackendAgent as any) as Agent[],
        [favoritesResponse]
    );

    const placeholderSelectCreator = () => { };

    return (
        <div>
            <h2 className="text-2xl font-bold text-foreground">My Favorites ({favoriteAgents.length})</h2>
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
                    <div className="text-center py-16 rounded-lg border-2 border-dashed border-input">
                        <h3 className="text-lg font-semibold text-foreground">No Favorited Agents</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click the heart icon on an agent to save it here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsContent: React.FC<{ user: User }> = ({ user }) => {
    const { toast } = useToast();
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
            toast('Profile updated successfully', 'success');
        } catch (error: any) {
            toast(error.message || 'Failed to update profile', 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast('New passwords do not match', 'error');
            return;
        }
        if (newPassword.length < 8) {
            toast('Password must be at least 8 characters', 'error');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await api.users.updatePassword({
                old_password: oldPassword,
                new_password: newPassword
            });
            toast('Password updated successfully', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast(error.message || 'Failed to update password', 'error');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>

            {/* Profile Section */}
            <div className="bg-card border border-border rounded-lg p-6 max-w-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-6">Profile Information</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">Username</label>
                            <p className="mt-1 text-foreground font-medium bg-secondary px-3 py-2 rounded border border-border">{user.username}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">Email Address</label>
                            <p className="mt-1 text-foreground font-medium bg-secondary px-3 py-2 rounded border border-border">{user.email}</p>
                        </div>
                    </div>

                    <div className="max-w-md">
                        <label htmlFor="full_name" className="block text-sm font-medium text-muted-foreground">Full Name</label>
                        <input
                            type="text"
                            id="full_name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-1 block w-full bg-background border border-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                            placeholder="Enter your full name"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                    <button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
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
            <div className="bg-card border border-border rounded-lg p-6 max-w-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-6">Change Password</h3>
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Current Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="mt-1 block w-full bg-background border border-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full bg-background border border-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Must be at least 8 characters with letters and numbers.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full bg-background border border-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                    <button
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword}
                        className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdatingPassword ? (
                            <>
                                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin"></div>
                                Updating...
                            </>
                        ) : 'Update Password'}
                    </button>
                </div>
            </div>

            {/* Account Details (Read Only) */}
            <div className="bg-muted/30 border border-border rounded-lg p-6 max-w-2xl">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Account Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase">Account Type</label>
                        <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground uppercase border border-border">
                            {user.role}
                        </span>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase">Member Since</label>
                        <p className="mt-1 text-sm text-foreground font-medium">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-muted-foreground uppercase">User ID</label>
                        <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate bg-secondary/50 p-1 rounded" title={user.id}>{user.id}</p>
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
            <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
            <div className="mt-6">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
                ) : (
                    <TransactionTable transactions={transactions} />
                )}
            </div>
        </div>
    )
};


// Parse streaming token format into clean text
const smartUnwrap = (data: any): string => {
    if (!data) return '';
    try {
        // Handle string data
        if (typeof data === 'string') {
            // First, try to parse newline-separated JSON objects
            const lines = data.split('\n').filter(line => line.trim());
            const tokens: string[] = [];
            let allParsed = true;

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line.trim());
                    if (parsed.type === 'token' && parsed.content !== undefined) {
                        tokens.push(parsed.content);
                    } else {
                        allParsed = false;
                        break;
                    }
                } catch {
                    allParsed = false;
                    break;
                }
            }

            if (allParsed && tokens.length > 0) {
                return tokens.join('');
            }

            // Try concatenated JSON objects: {...}{...}
            if (/}\s*{/.test(data)) {
                const fixed = '[' + data.replace(/}\s*{/g, '},{') + ']';
                const parsed = JSON.parse(fixed);
                return parsed.filter((t: any) => t.type === 'token' && t.content).map((t: any) => t.content).join('');
            }

            // Return as-is if no JSON pattern detected
            return data;
        }

        // Handle array of token objects
        if (Array.isArray(data)) {
            return data.filter((t: any) => t && t.type === 'token' && t.content).map((t: any) => t.content).join('');
        }

        // Handle object with response/result/text/content property
        if (typeof data === 'object') {
            const textSeed = data.response || data.result || data.text || data.content;
            if (textSeed) return typeof textSeed === 'string' ? smartUnwrap(textSeed) : JSON.stringify(textSeed);
            return JSON.stringify(data, null, 2);
        }

        return String(data);
    } catch (e) {
        return typeof data === 'string' ? data : JSON.stringify(data);
    }
};

const ExecutionDetailsModal: React.FC<{ execution: any; onClose: () => void }> = ({ execution, onClose }) => {
    const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
    const [localReviewStatus, setLocalReviewStatus] = React.useState(execution.review_status || 'none');
    const { toast } = useToast();

    if (!execution) return null;

    const handleRequestReview = async (note: string, priority?: 'standard' | 'high') => {
        try {
            await api.executions.requestReview(execution.id, note, priority);
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
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${execution.status === 'completed' ? 'bg-green-900 text-green-300' :
                                execution.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
                                }`}>
                                {execution.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-400">Review Status</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${execution.review_status === 'completed' ? 'bg-blue-900 text-blue-300' :
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
                            <pre className="text-gray-300 whitespace-pre-wrap">{smartUnwrap(execution.outputs)}</pre>
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
                                <div className="bg-blue-900/10 border border-blue-800 rounded-lg p-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 flex flex-col items-end gap-1">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <div key={s} className={`w-2 h-2 rounded-full ${execution.quality_score && s <= execution.quality_score ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-gray-700'}`} />
                                            ))}
                                        </div>
                                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Quality score</span>
                                    </div>

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Expert Verification</p>
                                            <p className="text-[10px] text-blue-400/60 font-medium">Provided by original creator</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-none">Internal Analysis</p>
                                            <p className="text-sm text-gray-100 leading-relaxed italic">{execution.review_response_note}</p>
                                        </div>

                                        {execution.refined_outputs && (
                                            <div className="bg-gray-900 border border-blue-900/30 rounded-xl p-4">
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <CheckCircle size={10} /> Refined Verified Result
                                                </p>
                                                <pre className="text-xs text-blue-50 font-medium whitespace-pre-wrap font-mono leading-relaxed">
                                                    {smartUnwrap(execution.refined_outputs)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                    {execution.reviewed_at && (
                                        <p className="text-[9px] text-gray-500 mt-4 text-right italic font-medium">
                                            Verified on {new Date(execution.reviewed_at).toLocaleDateString()} at {new Date(execution.reviewed_at).toLocaleTimeString()}
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
            <h2 className="text-2xl font-bold text-foreground">Run History</h2>
            <div className="mt-6">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading run history...</div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-secondary">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-muted-foreground sm:pl-6">Date</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Agent</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Status</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Review</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Credits</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {executions.length > 0 ? (
                                    executions.map((execution: any) => (
                                        <tr key={execution.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setSelectedExecution(execution)}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-foreground sm:pl-6">
                                                {new Date(execution.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                                                {execution.agent?.name || 'Unknown Agent'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {execution.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                                {execution.review_status && execution.review_status !== 'none' ? (
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${execution.review_status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                        {execution.review_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                                {execution.credits_used}
                                            </td>
                                            <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button className="text-brand-primary hover:text-brand-primary/80">View</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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
                return <UserReviewsPage />;
            default:
                return <OverviewContent user={user} setActivePage={setActivePage} onAddCredits={onAddCredits} />;
        }
    }

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">My Dashboard</h1>
                <p className="mt-2 text-lg text-muted-foreground">Welcome back, {user.full_name || user.username}.</p>
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
