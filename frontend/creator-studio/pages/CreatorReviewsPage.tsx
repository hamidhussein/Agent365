import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, User, Loader2, ArrowRight, Zap, TrendingUp, ArrowLeft, Search, Filter, ChevronUp, ChevronDown, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import ReviewResponseModal from '../../components/reviews/ReviewResponseModal';
import { useWebSocketEvent } from '@/lib/websocket/hooks';
import { AgentExecution } from '@/lib/types';
import ReviewAnalytics from '../components/reviews/ReviewAnalytics';

type TabType = 'pending' | 'completed' | 'all' | 'insights';

const CreatorReviewsPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedReview, setSelectedReview] = useState<AgentExecution | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [detailReview, setDetailReview] = useState<AgentExecution | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal'>('all');
  const [sortKey, setSortKey] = useState<'created_at' | 'agent' | 'requester' | 'status' | 'sla'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Listen for new review requests to auto-update dashboard
  useWebSocketEvent('review_requested', (message) => {
    console.log('[WebSocket] Dashboard update: New review requested', message);
    if (activeTab === 'pending' || activeTab === 'all') {
      refetch();
    }
  }, [activeTab]);

  // Listen for status changes
  useWebSocketEvent('review_status_changed', (message) => {
    console.log('[WebSocket] Dashboard update: Review status changed', message);
    refetch();
  }, []);

  const { data: reviewsResponse, isLoading, refetch } = useQuery({
    queryKey: ['creator-reviews', activeTab],
    queryFn: async () => {
      const status = activeTab === 'all' || activeTab === 'insights' ? undefined : activeTab as any;
      const response = await api.executions.getCreatorReviews(status);
      const payload = response.data as any;
      return Array.isArray(payload) ? payload : payload?.data ?? [];
    },
  });

  const reviews = useMemo(() => reviewsResponse ?? [], [reviewsResponse]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const pending = reviews.filter((r) => r.review_status === 'pending').length;
    const completedThisWeek = reviews.filter((r) => {
      if (r.review_status !== 'completed' || !r.reviewed_at) return false;
      const reviewedDate = new Date(r.reviewed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reviewedDate >= weekAgo;
    }).length;
    return { pending, completedThisWeek };
  }, [reviews]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, activeTab, pageSize]);

  const handleRespond = (review: AgentExecution) => {
    setSelectedReview(review);
    setIsResponseModalOpen(true);
  };

  const handleResponseSubmit = async (responseNote: string, refinedOutputs?: any, qualityScore?: number, internalNotes?: string) => {
    if (!selectedReview) return;
    
    try {
      await api.executions.respondToReview(selectedReview.id, responseNote, refinedOutputs, qualityScore, internalNotes);
      
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
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Zap className="w-3 h-3" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white rounded text-[9px] font-black uppercase tracking-tighter animate-pulse">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded text-[9px] font-black uppercase tracking-tighter">
            High
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-500 rounded text-[9px] font-black uppercase tracking-tighter">
            Normal
          </span>
        );
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

  const statusRank: Record<string, number> = {
    pending: 0,
    in_progress: 1,
    waiting_info: 2,
    completed: 3,
    rejected: 4,
    cancelled: 5,
    none: 6,
  };

  const filteredReviews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return reviews.filter((review) => {
      if (priorityFilter !== 'all') {
        const priority = (review.priority || 'normal').toLowerCase();
        if (priority !== priorityFilter) return false;
      }
      if (!query) return true;
      const haystack = [
        review.agent?.name || '',
        review.user_username || '',
        review.review_request_note || '',
        review.review_response_note || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [reviews, searchTerm, priorityFilter]);

  const sortedReviews = useMemo(() => {
    const list = [...filteredReviews];
    const compareValues = (aVal: string | number, bVal: string | number) => {
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return (aVal as number) - (bVal as number);
    };

    list.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortKey) {
        case 'agent':
          aVal = (a.agent?.name || '').toLowerCase();
          bVal = (b.agent?.name || '').toLowerCase();
          break;
        case 'requester':
          aVal = (a.user_username || '').toLowerCase();
          bVal = (b.user_username || '').toLowerCase();
          break;
        case 'status':
          aVal = statusRank[a.review_status || 'none'] ?? 99;
          bVal = statusRank[b.review_status || 'none'] ?? 99;
          break;
        case 'sla':
          aVal = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Number.MAX_SAFE_INTEGER;
          bVal = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        default:
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      const result = compareValues(aVal, bVal);
      return sortDir === 'asc' ? result : -result;
    });

    return list;
  }, [filteredReviews, sortKey, sortDir, statusRank]);

  const totalItems = sortedReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedReviews = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedReviews.slice(start, start + pageSize);
  }, [sortedReviews, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDir(key === 'created_at' ? 'desc' : 'asc');
  };

  const renderSortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) {
      return <ChevronUp className="w-3 h-3 opacity-20" />;
    }
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  const tabs: { id: TabType; label: string; icon?: React.ReactNode }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All Reviews' },
    { id: 'insights', label: 'Expert Insights', icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
        <div>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : window.location.assign('/studio'))}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground bg-muted/30 border border-border rounded-xl px-3 py-2 transition-all mb-4"
          >
            <ArrowLeft size={12} />
            Back to Studio
          </button>
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
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border w-fit mb-10 backdrop-blur-sm shadow-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'insights' && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agent, requester, or note..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-muted/30 border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                className="bg-transparent text-xs font-bold uppercase tracking-widest text-muted-foreground focus:outline-none"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {totalItems} reviews
            </span>
            <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' ? (
        <ReviewAnalytics />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Fetching verification requests...</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed border-border shadow-inner">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3">
            {searchTerm || priorityFilter !== 'all' ? 'No matches found' : 'All caught up!'}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto font-medium text-lg leading-relaxed lowercase">
            {searchTerm || priorityFilter !== 'all'
              ? "Try clearing your filters or search query."
              : activeTab === 'pending'
                ? "There are no pending review requests waiting for your expertise right now."
                : "No verification records found in this category."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground uppercase tracking-widest text-[10px] font-black">
                <tr>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Agent</th>
                  <th className="px-6 py-4 text-left">Requester</th>
                  <th className="px-6 py-4 text-left">Priority</th>
                  <th className="px-6 py-4 text-left">Requested</th>
                  <th className="px-6 py-4 text-left">SLA</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      {getStatusBadge(review.review_status || 'none')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{review.agent?.name || 'Unknown Agent'}</div>
                      {review.review_status === 'completed' && review.review_response_note && (
                        <div className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-1 italic">
                          {review.review_response_note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-border/50">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold text-foreground/80 lowercase italic">@{review.user_username || 'anonymous'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {review.review_status === 'pending'
                        ? getPriorityBadge(review.priority || 'normal')
                        : <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-semibold">
                      {formatDate(review.created_at)}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {review.review_status === 'pending' && review.sla_deadline ? (
                        <span className={`${new Date(review.sla_deadline) < new Date() ? 'text-red-500' : 'text-foreground/60'} font-bold`}>
                          {new Date(review.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {review.review_status === 'pending' ? (
                        <button
                          onClick={() => handleRespond(review)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all"
                        >
                          <MessageSquare size={14} />
                          Review
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <CheckCircle size={12} className="text-green-500" />
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
