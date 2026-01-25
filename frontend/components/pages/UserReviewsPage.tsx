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
      const allExecs = response.data.data || [];
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
          <h2 className="text-3xl font-black text-white tracking-tight uppercase tracking-tighter">Verification Requests</h2>
          <p className="text-gray-400 mt-1 font-medium italic">Track agent outputs you've sent for expert review.</p>
        </div>
        
        <div className="flex bg-gray-800/50 p-1.5 rounded-2xl border border-gray-700/50 backdrop-blur-sm self-start">
           {(['all', 'pending', 'completed'] as TabType[]).map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                 activeTab === tab 
                 ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                 : 'text-gray-400 hover:text-white'
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
           <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Fetching your requests...</p>
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-24 bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-700/50">
           <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-gray-600" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No verification records found</h3>
           <p className="text-gray-400 max-w-sm mx-auto mb-8 font-medium">
             {activeTab === 'all' 
               ? "You haven't requested any expert verifications for your runs yet." 
               : `You have no ${activeTab} verification requests.`}
           </p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                  onClick={() => window.location.hash = 'runs'}
                  className="px-8 py-3 bg-secondary text-white font-bold rounded-xl border border-gray-700 hover:bg-gray-700 transition-all uppercase tracking-widest text-xs"
              >
                  Create New Request
              </button>
              
              {(user?.role === 'creator' || user?.role === 'admin') && (
                <button 
                    onClick={() => window.location.pathname = '/studio'} 
                    className="px-8 py-3 bg-primary/10 text-primary font-bold rounded-xl border border-primary/20 hover:bg-primary/20 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                >
                    <Sparkles size={14} /> Perform Expert Verifications
                </button>
              )}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {executions.map((execution) => {
             const statusInfo = getStatusInfo(execution.review_status);
             return (
               <div 
                 key={execution.id} 
                 className="group bg-gray-800/40 border-2 border-gray-700/50 hover:border-primary/50 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col items-start cursor-pointer hover:-translate-y-1 active:scale-[0.98]"
                 onClick={() => setSelectedExecution(execution)}
               >
                  <div className="flex items-center justify-between w-full mb-6">
                     <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${statusInfo.className}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                     </div>
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">#{execution.id.slice(-6)}</span>
                  </div>

                  <h4 className="text-xl font-black text-white mb-2 group-hover:text-primary transition-colors">{execution.agent?.name}</h4>
                  
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {new Date(execution.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                     </p>
                  </div>

                  <div className="space-y-4 w-full mb-8">
                    <div className="bg-gray-900/50 rounded-2xl p-4 w-full border border-gray-800/50 group-hover:bg-gray-900 transition-colors relative">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Your Question</label>
                        <p className="text-sm text-gray-300 line-clamp-2 italic font-medium">
                            "{execution.review_request_note || 'General optimization request.'}"
                        </p>
                    </div>

                    <div className="bg-gray-800/20 rounded-2xl p-4 w-full border border-gray-700/30">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Original Output Preview</label>
                        <p className="text-[11px] text-gray-500 font-mono line-clamp-2">
                           {smartUnwrapSnippet(execution.outputs)}
                        </p>
                    </div>
                  </div>

                  <div className="mt-auto w-full flex items-center justify-between pt-5 border-t border-gray-700/30">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Expert Feedback</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${execution.review_status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gray-700/50 text-gray-400'}`}>
                           {execution.review_status === 'completed' ? 'AVAILABLE' : 'PENDING'}
                        </span>
                     </div>
                     <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg group-hover:shadow-primary/20">
                        <ArrowRight size={18} />
                     </div>
                  </div>
               </div>
             );
          })}
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
