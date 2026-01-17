import React, { useEffect, useState } from 'react';
import { AgentExecution } from '../../src/lib/types';
import { api } from '../../src/lib/api/client';
import { AlertCircle, CheckCircle, MessageSquare, User } from 'lucide-react';
import { useToast } from '../../src/contexts/ToastContext';

const ReviewsPage: React.FC = () => {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState<AgentExecution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedReview, setSelectedReview] = useState<AgentExecution | null>(null);
    const [responseNote, setResponseNote] = useState('');
    const [responding, setResponding] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [historyReviews, setHistoryReviews] = useState<AgentExecution[]>([]);

    useEffect(() => {
        loadReviews();
    }, [activeTab]);

    const loadReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'pending') {
                const response = await api.executions.getPendingReviews();
                const data = response.data as any;
                setReviews(data.data || data || []);
            } else {
                // Use exact ReviewStatus enum value 'completed' (lowercase)
                const response = await api.executions.getCreatorReviews('completed');
                const data = response.data as any;
                setHistoryReviews(data.data || data || []);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async () => {
        if (!selectedReview || !responseNote.trim()) return;
        
        setResponding(true);
        try {
            await api.executions.respondToReview(selectedReview.id, responseNote, undefined);
            showToast('Response sent! The user has been notified.', 'success');
            setSelectedReview(null);
            setResponseNote('');
            // Reload reviews
            await loadReviews();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to send response', 'error');
        } finally {
            setResponding(false);
        }
    };

    if (loading && reviews.length === 0 && historyReviews.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-400">Loading reviews...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-400 p-4 bg-red-900/20 rounded-lg">
                <AlertCircle size={20} />
                {error}
            </div>
        );
    }

    const currentDisplayList = activeTab === 'pending' ? reviews : historyReviews;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white">Expert Reviews</h2>
                    <p className="text-gray-400 mt-2">
                        Manage review requests and view your response history
                    </p>
                </div>
                
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'pending' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Pending Requests ({reviews.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'history' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {currentDisplayList.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">All caught up!</h3>
                    <p className="text-gray-400 mt-2">No {activeTab} reviews at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {currentDisplayList.map((review) => (
                        <div
                            key={review.id}
                            className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 hover:border-brand-primary/50 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="w-4 h-4 text-brand-primary" />
                                        <span className="text-sm font-medium text-brand-primary">
                                            {(review as any).user_username || (review.user_id ? `User: ${review.user_id.toString().slice(0, 8)}...` : 'Guest User')}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                            review.review_status === 'completed' ? 'bg-blue-900/50 text-blue-400 border border-blue-700/50' : 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
                                        }`}>
                                            {review.review_status}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        Agent: {review.agent?.name || review.agent_id.toString().slice(0, 8)}
                                    </h3>
                                    
                                    <div className="bg-gray-900/50 rounded-md p-3 mb-3">
                                        <p className="text-sm font-medium text-gray-300 mb-1">User's Request:</p>
                                        <p className="text-gray-400">{review.review_request_note}</p>
                                    </div>

                                    {review.review_status === 'completed' && (
                                        <div className="bg-blue-900/10 rounded-md p-3 mb-3 border border-blue-900/30">
                                            <p className="text-sm font-medium text-blue-300 mb-1">Your Response:</p>
                                            <p className="text-gray-300 italic">"{review.review_response_note}"</p>
                                        </div>
                                    )}

                                    {review.review_status === 'pending' && (
                                        <button
                                            onClick={() => setSelectedReview(review)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors text-sm font-medium"
                                        >
                                            <MessageSquare size={16} />
                                            Respond to Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Response Modal */}
            {selectedReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedReview(null)}>
                    <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-2xl font-bold text-white">Respond to Review Request</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left: Original Data */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-300 mb-2">User's Inputs</h3>
                                        <div className="bg-gray-800 rounded-md p-3 text-sm">
                                            <pre className="text-gray-300 whitespace-pre-wrap">
                                                {JSON.stringify(selectedReview.inputs, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-300 mb-2">AI's Output</h3>
                                        <div className="bg-gray-800 rounded-md p-3 text-sm">
                                            {selectedReview.outputs?.text ? (
                                                <div className="text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                                    {selectedReview.outputs.text}
                                                </div>
                                            ) : (
                                                <pre className="text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                                    {JSON.stringify(selectedReview.outputs, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-300 mb-2">User's Request</h3>
                                        <div className="bg-amber-900/20 border border-amber-700/50 rounded-md p-3">
                                            <p className="text-amber-200">{selectedReview.review_request_note}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Response Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Your Response
                                        </label>
                                        <textarea
                                            value={responseNote}
                                            onChange={(e) => setResponseNote(e.target.value)}
                                            placeholder="Explain what you've done or provide guidance..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary outline-none min-h-[200px]"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleRespond}
                                            disabled={responding || !responseNote.trim()}
                                            className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                            {responding ? 'Sending...' : 'Send Response & Mark Complete'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedReview(null);
                                                setResponseNote('');
                                            }}
                                            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsPage;
