import React, { useState } from 'react';
import { X, Send, Loader2, MessageSquare, Sparkles, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

import { AgentExecution } from '@/lib/types';

interface ReviewResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responseNote: string, updatedOutputs?: any, qualityScore?: number, internalNotes?: string) => Promise<void>;
  review: AgentExecution;
}

const QUICK_TEMPLATES = [
  {
    icon: <CheckCircle size={16} />,
    label: 'Verified Correct',
    text: 'I have reviewed this output and verified that it is correct as generated. The agent performed as expected for your use case.',
    color: 'text-green-500 bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
  },
  {
    icon: <AlertCircle size={16} />,
    label: 'Minor Fix Applied',
    text: 'I found a minor issue and have applied a correction. Please see the refined output for the updated result.',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
  },
  {
    icon: <Lightbulb size={16} />,
    label: 'Optimization Tip',
    text: 'The output is accurate, but I noticed an opportunity for improvement. Consider the following suggestion for better results next time:',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
  },
];

const ReviewResponseModal: React.FC<ReviewResponseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  review,
}) => {
  const [responseNote, setResponseNote] = useState('');
  const [refinedOutputsStr, setRefinedOutputsStr] = useState('');
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [internalNotes, setInternalNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'note' | 'refine'>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

  React.useEffect(() => {
    if (isOpen && review) {
      const cleanText = smartUnwrap(review.outputs);
      setRefinedOutputsStr(cleanText);
    }
  }, [isOpen, review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNote.trim()) {
      setError('Please provide a response note');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let refinedData = undefined;
      if (activeTab === 'refine' || refinedOutputsStr.trim()) {
          refinedData = { response: refinedOutputsStr };
      }

      await onSubmit(responseNote, refinedData, qualityScore, internalNotes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (templateText: string) => {
    setResponseNote(templateText);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 bg-muted/30 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Expert Verification</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                Refining: {review.agent?.name} • For: @{review.user_username}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-2 rounded-xl">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-6">
            <div className="flex bg-muted/50 p-1.5 rounded-2xl w-fit border border-border/50 backdrop-blur-sm">
                <button
                    type="button"
                    onClick={() => setActiveTab('note')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'note' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    1. Expert Note
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('refine')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'refine' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    2. Refine Result <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                </button>
            </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'note' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                          User's Inquiry
                        </label>
                        <div className="bg-muted/40 border border-border rounded-2xl p-5 shadow-inner italic">
                          <p className="text-foreground text-sm leading-relaxed font-bold">
                              "{review.review_request_note || 'Requested general optimization.'}"
                          </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                          Calculated Agent Output
                        </label>
                        <div className="bg-secondary/40 border border-border rounded-2xl p-5 max-h-40 overflow-y-auto shadow-inner group">
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap">
                              {smartUnwrap(review.outputs)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Templates */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} className="text-primary" /> Quick Templates
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {QUICK_TEMPLATES.map((template, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => applyTemplate(template.text)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${template.color}`}
                            >
                                {template.icon}
                                {template.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                       Expert Response Note <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        autoFocus
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Detail your analysis and the improvements you've made..."
                        className="w-full h-32 bg-muted/20 border-2 border-border rounded-2xl px-6 py-5 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm font-medium text-lg leading-relaxed"
                      />
                      <div className="absolute right-4 bottom-4 text-[10px] font-black text-muted-foreground/30 uppercase">
                         markdown supported
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            Quality Verification Score (1-5)
                        </label>
                        <div className="flex items-center gap-4 bg-muted/20 border border-border rounded-2xl p-6">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                    key={score}
                                    type="button"
                                    onClick={() => setQualityScore(score)}
                                    className={`w-10 h-10 rounded-full font-black transition-all ${qualityScore === score ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                                >
                                    {score}
                                </button>
                            ))}
                            <span className="ml-2 text-xs font-bold text-foreground/60 italic">
                                {qualityScore === 5 ? 'Perfect' : qualityScore === 4 ? 'Good' : qualityScore === 3 ? 'Average' : 'Needs Work'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            Internal Private Notes (Expert Only)
                        </label>
                        <textarea
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            placeholder="Reasoning for score, tips for other experts..."
                            className="w-full h-24 bg-secondary/20 border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/30 transition-all resize-none italic"
                        />
                    </div>
                </div>
              </div>
          )}

          {activeTab === 'refine' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-start gap-4 shadow-xl shadow-primary/5">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                         <Send className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                          <strong className="text-primary font-black uppercase tracking-widest block mb-1">Expert Verification Mode</strong>
                          You are editing the verified output. This version will be marked as "Expert Verified" and shown prominently to the user alongside the AI's original attempt.
                      </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center justify-between">
                        Verified Outcome
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground lowercase font-medium">plain text format</span>
                    </label>
                    <div className="relative group">
                        <textarea
                            value={refinedOutputsStr}
                            onChange={(e) => setRefinedOutputsStr(e.target.value)}
                            className="w-full h-96 bg-gray-950 border-2 border-border rounded-2xl p-8 text-base font-medium text-green-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-2xl leading-relaxed"
                            spellCheck={true}
                            placeholder="Type or paste the perfect response here..."
                        />
                        <div className="absolute top-4 right-4 animate-pulse">
                           <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                        </div>
                    </div>
                  </div>
              </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm font-bold flex items-center gap-3 animate-shake">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6 mt-auto border-t border-border/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-muted/50 hover:bg-muted text-foreground font-black rounded-2xl border border-border transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !responseNote.trim()}
              className={`flex-[2] py-4 text-primary-foreground font-black rounded-2xl transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-primary hover:bg-primary/90 uppercase tracking-widest text-xs`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying Output...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {activeTab === 'refine' ? 'Finalize & Publish Verified Outcome' : 'Continue to Proofing'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewResponseModal;
