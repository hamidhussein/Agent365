// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, Search, Filter, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';
import UserReviewDetails from '../reviews/UserReviewDetails';

type TabType = 'all' | 'pending' | 'completed';

const UserReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedExecution, setSelectedExecution] = useState<any>(null);

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
          label: 'Review Received',
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Review Library</h2>
          <p className="text-gray-400 mt-1 font-medium">Track and learn from expert analysis of your agent runs.</p>
        </div>
        
        <div className="flex bg-gray-800/50 p-1.5 rounded-2xl border border-gray-700/50 backdrop-blur-sm self-start">
           {(['all', 'pending', 'completed'] as TabType[]).map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                 activeTab === tab 
                 ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105' 
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
           <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
           <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading your review history...</p>
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-24 bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-700/50">
           <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-gray-600" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No reviews found in this category</h3>
           <p className="text-gray-400 max-w-xs mx-auto mb-8 font-medium">Requested reviews will appear here once they're submitted from your run history.</p>
           <button 
                onClick={() => window.location.hash = 'runs'} // Mock navigation to runs if needed
                className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl border border-gray-700 hover:bg-gray-700 transition-all"
            >
                View Run History
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {executions.map((execution) => {
             const statusInfo = getStatusInfo(execution.review_status);
             return (
               <div 
                 key={execution.id} 
                 className="group bg-gray-800/40 border border-gray-700/50 hover:border-brand-primary/50 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-brand-primary/5 flex flex-col items-start cursor-pointer hover:-translate-y-1"
                 onClick={() => setSelectedExecution(execution)}
               >
                  <div className="flex items-center justify-between w-full mb-6">
                     <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${statusInfo.className}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                     </div>
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">#{execution.id.slice(-6)}</span>
                  </div>

                  <h4 className="text-lg font-black text-white mb-2 group-hover:text-brand-primary transition-colors">{execution.agent?.name}</h4>
                  
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {new Date(execution.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                     </p>
                  </div>

                  <div className="bg-gray-900/50 rounded-2xl p-4 w-full mb-6 border border-gray-800/50 group-hover:bg-gray-900 transition-colors">
                     <p className="text-sm text-gray-400 line-clamp-3 italic font-medium">
                        "{execution.review_request_note || 'Requested review for optimization.'}"
                     </p>
                  </div>

                  <div className="mt-auto w-full flex items-center justify-between pt-4 border-t border-gray-700/30">
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">Response:</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${execution.review_status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                           {execution.review_status === 'completed' ? 'Received' : 'Waiting...'}
                        </span>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <ArrowRight size={16} />
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
