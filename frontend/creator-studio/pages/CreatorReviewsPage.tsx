import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, User, Loader2, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/client';
import ReviewResponseModal from '../../components/reviews/ReviewResponseModal';

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

const CreatorReviewsPage: React.FC = () => {
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

  // Calculate quick stats
  const stats = useMemo(() => {
    const pending = reviews.filter((r: Review) => r.review_status === 'pending').length;
    const completedThisWeek = reviews.filter((r: Review) => {
      if (r.review_status !== 'completed' || !r.reviewed_at) return false;
      const reviewedDate = new Date(r.reviewed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reviewedDate >= weekAgo;
    }).length;
    return { pending, completedThisWeek };
  }, [reviews]);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs font-bold shadow-sm">
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

  const smartUnwrapSnippet = (data: any): string => {
    if (!data) return '';
    try {
      if (typeof data === 'string' && /}\s*{/.test(data)) {
        const fixed = '[' + data.replace(/}\s*{/g, '},{') + ']';
        const parsed = JSON.parse(fixed);
        return parsed.filter((t: any) => t.type === 'token' && t.content).map((t: any) => t.content).join('').slice(0, 100) + '...';
      }
      if (Array.isArray(data)) {
        return data.filter((t: any) => t && t.type === 'token' && t.content).map((t: any) => t.content).join('').slice(0, 100) + '...';
      }
      if (typeof data === 'object') {
        const text = data.response || data.result || data.text || data.content;
        if (text) return (typeof text === 'string' ? text : JSON.stringify(text)).slice(0, 100) + '...';
      }
      return String(data).slice(0, 100) + '...';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-primary" /> Expert Verification
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Manage and refine agent outputs to maintain the highest quality standards.</p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pending</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-green-500">{stats.completedThisWeek}</p>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">This Week</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 text-center hidden sm:block">
            <div className="flex items-center gap-1 justify-center">
              <TrendingUp size={16} className="text-primary" />
              <p className="text-lg font-black text-primary">Pro</p>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Expert</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border w-fit mb-8 backdrop-blur-sm">
        {(['pending', 'completed', 'all'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Fetching verification requests...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed border-border shadow-inner">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3">All caught up!</h3>
          <p className="text-muted-foreground max-w-sm mx-auto font-medium text-lg leading-relaxed lowercase">
            {activeTab === 'pending'
              ? "There are no pending review requests waiting for your expertise right now."
              : "No verification records found in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {reviews.map((review: Review) => (
            <div
              key={review.id}
              className="group bg-card border border-border hover:border-primary/50 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col items-start cursor-pointer border-t-4 active:scale-[0.99]"
              style={{ borderTopColor: review.review_status === 'pending' ? '#f59e0b' : '#10b981' }}
               onClick={() => review.review_status === 'pending' && handleRespond(review)}
            >
              <div className="flex items-center justify-between w-full mb-6">
                <div className="flex items-center gap-2">
                   {getStatusBadge(review.review_status)}
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{formatDate(review.created_at)}</span>
                </div>
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-mono text-[10px]">
                   #{review.id.slice(-4)}
                </div>
              </div>

              <h3 className="text-xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">
                {review.agent?.name || 'Unknown Agent'}
              </h3>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center border border-border/50 shadow-inner">
                   <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">Client Requester</span>
                  <span className="text-sm font-bold text-foreground/80 lowercase italic leading-none">@{review.user_username || 'anonymous'}</span>
                </div>
              </div>

              {/* User's Request & Output */}
              <div className="space-y-4 w-full mb-8">
                <div className="bg-secondary/40 rounded-2xl p-5 w-full border border-border group-hover:bg-secondary/60 transition-colors">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 block">User Inquiry</label>
                  <p className="text-foreground text-sm font-medium leading-relaxed italic line-clamp-3">
                    "{review.review_request_note || 'Requested verified output optimization.'}"
                  </p>
                </div>

                <div className="bg-muted/30 rounded-2xl p-5 w-full border border-border/50">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Agent Output Preview</label>
                    <p className="text-[11px] text-muted-foreground/60 font-mono line-clamp-2">
                       {smartUnwrapSnippet(review.outputs)}
                    </p>
                </div>
              </div>

              {/* Response (if completed) */}
              {review.review_status === 'completed' && review.review_response_note && (
                <div className="bg-green-500/5 dark:bg-green-500/5 border border-green-500/10 rounded-2xl p-5 mb-6 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest">
                      Your Verification
                    </p>
                    {review.reviewed_at && (
                      <span className="text-[10px] text-green-600/40 dark:text-green-500/40 font-bold">
                        {formatDate(review.reviewed_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground/70 text-sm font-medium leading-relaxed line-clamp-2 font-mono text-xs italic">
                    {review.review_response_note}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto w-full pt-4 border-t border-border/50 flex items-center justify-between group-hover:border-primary/20">
                {review.review_status === 'pending' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRespond(review); }}
                    className="w-full py-3 bg-primary text-primary-foreground font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 uppercase tracking-widest text-[10px]"
                  >
                    <MessageSquare size={16} />
                    Begin Proofing
                  </button>
                ) : (
                   <div className="flex items-center justify-between w-full text-muted-foreground">
                      <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                         <CheckCircle size={14} className="text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] rounded-full" /> Result Verified
                      </span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-primary" />
                   </div>
                )}
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

export default CreatorReviewsPage;
