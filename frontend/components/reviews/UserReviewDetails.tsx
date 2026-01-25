// @ts-nocheck
import React from 'react';
import { X, MessageSquare, Clock, CheckCircle, FileText, Bot, User, ArrowRight } from 'lucide-react';

interface UserReviewDetailsProps {
  execution: any;
  onClose: () => void;
}

const UserReviewDetails: React.FC<UserReviewDetailsProps> = ({ execution, onClose }) => {
  if (!execution) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = () => {
    switch (execution.review_status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            Pending Expert Review
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" />
            Review Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded-full text-xs font-bold shadow-sm">
            None
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Expert Review Result</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Agent: <span className="text-foreground font-semibold">{execution.agent?.name}</span></span>
                <span className="text-border">|</span>
                <span className="text-xs text-muted-foreground">{formatDate(execution.created_at)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-2 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status and Expert Note */}
          <div className="bg-muted/40 rounded-2xl p-6 border border-border flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Status</label>
                {getStatusBadge()}
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Requested On</label>
                <p className="text-sm font-medium text-foreground">{formatDate(execution.created_at)}</p>
              </div>
              {execution.reviewed_at && (
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Responded On</label>
                  <p className="text-sm font-medium text-foreground">{formatDate(execution.reviewed_at)}</p>
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 block">Expert's Response Note</label>
              {execution.review_status === 'completed' ? (
                <div className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
                  <p className="text-foreground text-base leading-relaxed font-medium pl-4 italic">
                    "{execution.review_response_note || 'The expert has verified this output.'}"
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground italic">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <p>The expert is currently reviewing your request...</p>
                </div>
              )}
            </div>
          </div>

          {/* User's Original Request */}
          <div className="space-y-3">
             <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Your Request Clarification</label>
             <div className="bg-secondary/50 border border-border rounded-xl p-4">
               <p className="text-sm text-foreground font-medium">{execution.review_request_note || 'No additional note provided.'}</p>
             </div>
          </div>

          {/* Pro Level Side-by-Side Comparison */}
          {execution.review_status === 'completed' && execution.refined_outputs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Output Comparison (Verified Result)</label>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase">PRO Feature</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                 {/* Original Side */}
                 <div className="flex flex-col border border-border rounded-2xl overflow-hidden bg-muted/20">
                    <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center justify-between">
                       <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Original Output</span>
                       <Bot size={14} className="text-muted-foreground" />
                    </div>
                    <div className="p-5 font-medium text-sm text-foreground/70 overflow-y-auto max-h-[400px]">
                       <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                         {typeof execution.outputs === 'string' 
                            ? execution.outputs 
                            : (execution.outputs?.response || execution.outputs?.result || JSON.stringify(execution.outputs, null, 2))}
                       </pre>
                    </div>
                 </div>

                 {/* Desktop Decorator Arrow */}
                 <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-card border border-border rounded-full items-center justify-center z-10 shadow-lg">
                    <ArrowRight size={20} className="text-primary" />
                 </div>

                 {/* Refined Side */}
                 <div className="flex flex-col border-2 border-primary/30 rounded-2xl overflow-hidden bg-primary/5 shadow-xl shadow-primary/5">
                    <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
                       <span className="text-xs font-black text-primary uppercase tracking-widest">Expert Verified Output</span>
                       <CheckCircle size={14} className="text-primary" />
                    </div>
                    <div className="p-5 font-bold text-sm text-foreground overflow-y-auto max-h-[400px]">
                       <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                         {typeof execution.refined_outputs === 'string'
                            ? execution.refined_outputs
                            : (execution.refined_outputs?.response || execution.refined_outputs?.result || JSON.stringify(execution.refined_outputs, null, 2))}
                       </pre>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Simple output view if not completed or no refined output */}
          {(execution.review_status !== 'completed' || !execution.refined_outputs) && (
             <div className="space-y-4">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Run Execution Output</label>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-inner">
                  <pre className="text-sm text-foreground font-medium whitespace-pre-wrap font-mono leading-relaxed">
                    {JSON.stringify(execution.outputs, null, 2)}
                  </pre>
                </div>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/10 border-t border-border flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-secondary hover:bg-muted text-foreground font-black rounded-xl border border-border transition-all active:scale-[0.98]"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserReviewDetails;
