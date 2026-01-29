// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, Search, Filter, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';
import UserReviewDetails from '../reviews/UserReviewDetails';
import { useAuth } from '@/lib/hooks/useAuth';

type TabType = 'all' | 'pending' | 'completed';

const UserReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const { user } = useAuth(); // To check if the user is a creator

  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['user-reviews', activeTab],
    queryFn: async () => {
      // For now, fetch all executions and filter. 
      // In a real pro app, we'd have a specific endpoint or better query params.
      const response = await api.executions.list();
      const payload = response.data as any;
      const allExecs = Array.isArray(payload) ? payload : payload?.data ?? [];
      // Filter for executions that have a review status
      return allExecs.filter(e => e.review_status && e.review_status !== 'none' && (activeTab === 'all' || e.review_status === activeTab));
    },
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending Expert',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Verification Received',
          className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4" />,
          label: status,
          className: 'bg-primary/10 text-primary border-primary/20'
        };
    }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">Verification Requests</h2>
          <p className="text-muted-foreground mt-1 font-medium italic">Track agent outputs you've sent for expert review.</p>
        </div>
        
        <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/60 backdrop-blur-sm self-start">
           {(['all', 'pending', 'completed'] as TabType[]).map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                 activeTab === tab 
                 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                 : 'text-muted-foreground hover:text-foreground'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
           <Loader2 className="w-12 h-12 text-primary animate-spin" />
           <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Fetching your requests...</p>
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-24 bg-card/60 rounded-3xl border-2 border-dashed border-border/60">
           <div className="w-20 h-20 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground" />
           </div>
           <h3 className="text-xl font-bold text-foreground mb-2">No verification records found</h3>
           <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium">
             {activeTab === 'all' 
               ? "You haven't requested any expert verifications for your runs yet." 
               : `You have no ${activeTab} verification requests.`}
           </p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                  onClick={() => window.location.hash = 'runs'}
                  className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl border border-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-xs"
              >
                  Create New Request
              </button>
              
              {(user?.role === 'creator' || user?.role === 'admin') && (
                <button 
                    onClick={() => window.location.pathname = '/studio'} 
                    className="px-8 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border hover:bg-secondary/80 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                >
                    <Sparkles size={14} /> Perform Expert Verifications
                </button>
              )}
           </div>
        </div>
      ) : (
        <div className="bg-card/80 border border-border/60 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/70 text-muted-foreground uppercase tracking-widest text-[10px] font-black sticky top-0">
                <tr>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Agent</th>
                  <th className="px-5 py-3 text-left">Requested</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {executions.map((execution) => {
                  const statusInfo = getStatusInfo(execution.review_status);
                  return (
                    <tr
                      key={execution.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <td className="px-5 py-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusInfo.className}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-foreground">{execution.agent?.name || 'Unknown Agent'}</div>
                        <div className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest font-mono">#{execution.id.slice(-6)}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground font-semibold">
                        {new Date(execution.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExecution(execution);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <ArrowRight size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedExecution && (
        <UserReviewDetails 
          execution={selectedExecution} 
          onClose={() => setSelectedExecution(null)} 
        />
      )}
    </div>
  );
};

export default UserReviewsPage;
