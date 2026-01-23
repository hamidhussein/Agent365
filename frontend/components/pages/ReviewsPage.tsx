// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import ReviewResponseModal from '../reviews/ReviewResponseModal';

interface Review {
  id: string;
  agent: {
    id: string;
    name: string;
  };
  user_username: string;
  review_status: string;
  review_request_note: string;
  review_response_note?: string;
  created_at: string;
  reviewed_at?: string;
  inputs: any;
  outputs: any;
}

type TabType = 'pending' | 'completed' | 'all';

const ReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ['creator-reviews', activeTab],
    queryFn: async () => {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await api.executions.getCreatorReviews(status);
      return response.data;
    },
  });

  const handleRespond = (review: Review) => {
    setSelectedReview(review);
    setIsResponseModalOpen(true);
  };

  const handleResponseSubmit = async (responseNote: string, refinedOutputs?: any) => {
    if (!selectedReview) return;
    
    try {
      await api.executions.respondToReview(selectedReview.id, responseNote, refinedOutputs);
      
      setIsResponseModalOpen(false);
      setSelectedReview(null);
      refetch();
    } catch (err: any) {
      console.error('Failed to submit response:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/20 text-amber-400 border border-amber-800/30 rounded-full text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/20 text-green-400 border border-green-800/30 rounded-full text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Expert Reviews</h1>
        <p className="text-gray-400">Manage review requests from users of your agents</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['pending', 'completed', 'all'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors relative ${
              activeTab === tab
                ? 'text-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-lg border border-gray-700">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Reviews Yet</h3>
          <p className="text-gray-400 text-sm">
            {activeTab === 'pending'
              ? "You don't have any pending review requests"
              : activeTab === 'completed'
              ? "You haven't completed any reviews yet"
              : 'No review requests found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: Review) => (
            <div
              key={review.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(review.review_status)}
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-400">{formatDate(review.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {review.agent?.name || 'Unknown Agent'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User className="w-4 h-4" />
                    <span>@{review.user_username || 'Guest User'}</span>
                  </div>
                </div>
              </div>

              {/* User's Request */}
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  User's Request
                </p>
                <p className="text-white text-sm leading-relaxed">
                  {review.review_request_note || 'No note provided'}
                </p>
              </div>

              {/* Response (if completed) */}
              {review.review_status === 'completed' && review.review_response_note && (
                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                      Your Response
                    </p>
                    {review.reviewed_at && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(review.reviewed_at)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {review.review_response_note}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {review.review_status === 'pending' && (
                  <button
                    onClick={() => handleRespond(review)}
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Respond
                  </button>
                )}
                {/* 
                <button
                  onClick={() => {
                    console.log('View execution:', review.id);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  View Full Execution
                </button>
                */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {selectedReview && (
        <ReviewResponseModal
          isOpen={isResponseModalOpen}
          onClose={() => {
            setIsResponseModalOpen(false);
            setSelectedReview(null);
          }}
          onSubmit={handleResponseSubmit}
          review={selectedReview}
        />
      )}
    </div>
  );
};

export default ReviewsPage;
