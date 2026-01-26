import React, { useState } from 'react';
import { X, MessageSquare, Clock, CheckCircle, Bot, ArrowRight, Download, Heart, Copy, Check, Sparkles } from 'lucide-react';

interface UserReviewDetailsProps {
  execution: any;
  onClose: () => void;
}

const UserReviewDetails: React.FC<UserReviewDetailsProps> = ({ execution, onClose }) => {
  const [hasThanked, setHasThanked] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!execution) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

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

  const handleExportMarkdown = () => {
    const originalOutput = smartUnwrap(execution.outputs);
    const refinedOutput = execution.refined_outputs ? smartUnwrap(execution.refined_outputs) : null;

    let markdown = `# Expert Review Result\n\n`;
    markdown += `**Agent:** ${execution.agent?.name || 'Unknown'}\n`;
    markdown += `**Requested:** ${formatDate(execution.created_at)}\n`;
    if (execution.reviewed_at) markdown += `**Completed:** ${formatDate(execution.reviewed_at)}\n`;
    markdown += `\n## Your Request\n> ${execution.review_request_note || 'No note provided.'}\n\n`;
    if (execution.review_response_note) markdown += `## Expert's Response\n> ${execution.review_response_note}\n\n`;
    markdown += `## Original Output\n\`\`\`\n${originalOutput}\n\`\`\`\n\n`;
    if (refinedOutput) markdown += `## Verified Output\n\`\`\`\n${refinedOutput}\n\`\`\`\n`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-${execution.id.slice(-6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyVerified = () => {
    const text = smartUnwrap(execution.refined_outputs || execution.outputs);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Timeline Steps
  const timelineSteps = [
    { label: 'Requested', date: execution.created_at, completed: true, icon: <MessageSquare size={16} /> },
    { label: 'In Review', date: null, completed: execution.review_status === 'in_progress' || execution.review_status === 'completed', icon: <Clock size={16} /> },
    { label: 'Completed', date: execution.reviewed_at, completed: execution.review_status === 'completed', icon: <CheckCircle size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 bg-muted/30 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center ring-4 ring-primary/5">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Expert Review Result</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Agent:</span>
                <span className="text-xs text-foreground font-black">{execution.agent?.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-3 rounded-2xl">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Timeline */}
          <div className="flex items-center justify-between bg-muted/30 rounded-2xl p-6 border border-border">
            {timelineSteps.map((step, index) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${step.completed ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {step.icon}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                  {step.date && <span className="text-[10px] text-muted-foreground mt-1">{formatDate(step.date)}</span>}
                </div>
                {index < timelineSteps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${step.completed ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Expert's Note */}
          <div className="space-y-3">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Expert's Response</label>
            {execution.review_status === 'completed' ? (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative">
                <div className="absolute -left-1 top-6 bottom-6 w-1.5 bg-primary rounded-full" />
                <p className="text-foreground text-lg leading-relaxed font-medium pl-4 italic">
                  "{execution.review_response_note || 'The expert has verified this output.'}"
                </p>
                {!hasThanked && (
                  <button
                    onClick={() => setHasThanked(true)}
                    className="mt-4 ml-4 flex items-center gap-2 px-4 py-2 bg-pink-500/10 text-pink-500 rounded-xl border border-pink-500/20 text-xs font-black uppercase tracking-widest hover:bg-pink-500/20 transition-all"
                  >
                    <Heart size={14} /> Thank Expert
                  </button>
                )}
                {hasThanked && (
                  <div className="mt-4 ml-4 flex items-center gap-2 text-pink-500 text-xs font-bold">
                    <Heart size={14} className="fill-current" /> Thanks sent!
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                <p className="text-amber-600 dark:text-amber-400 font-medium">The expert is currently reviewing your request...</p>
              </div>
            )}
          </div>

          {/* Your Request */}
          <div className="space-y-3">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Your Request</label>
            <div className="bg-secondary/50 border border-border rounded-2xl p-5">
              <p className="text-sm text-foreground font-medium leading-relaxed">{execution.review_request_note || 'No additional note provided.'}</p>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          {execution.review_status === 'completed' && execution.refined_outputs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" /> Output Comparison
                </label>
                <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-lg font-black uppercase tracking-widest">Pro Feature</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {/* Original Side */}
                <div className="flex flex-col border border-border rounded-2xl overflow-hidden bg-muted/20">
                  <div className="px-5 py-3 bg-muted border-b border-border flex items-center justify-between">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Original Output</span>
                    <Bot size={16} className="text-muted-foreground" />
                  </div>
                  <div className="p-6 font-medium text-sm text-foreground/60 overflow-y-auto max-h-[400px]">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {smartUnwrap(execution.outputs)}
                    </pre>
                  </div>
                </div>

                {/* Desktop Arrow */}
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-card border-2 border-primary rounded-full items-center justify-center z-10 shadow-xl shadow-primary/10">
                  <ArrowRight size={20} className="text-primary" />
                </div>

                {/* Refined Side */}
                <div className="flex flex-col border-2 border-primary/30 rounded-2xl overflow-hidden bg-primary/5 shadow-xl shadow-primary/5">
                  <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Expert Verified</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyVerified}
                        className="p-1.5 hover:bg-primary/20 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-primary" />}
                      </button>
                      <CheckCircle size={16} className="text-primary" />
                    </div>
                  </div>
                  <div className="p-6 font-bold text-sm text-foreground overflow-y-auto max-h-[400px]">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {smartUnwrap(execution.refined_outputs)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simple output if not completed */}
          {(execution.review_status !== 'completed' || !execution.refined_outputs) && (
            <div className="space-y-4">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Run Execution Output</label>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-inner">
                <pre className="text-sm text-foreground font-medium whitespace-pre-wrap font-mono leading-relaxed">
                  {smartUnwrap(execution.outputs)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-muted/10 border-t border-border flex items-center justify-between shrink-0">
          <button 
            onClick={handleExportMarkdown}
            className="flex items-center gap-2 px-5 py-3 bg-secondary hover:bg-muted text-foreground font-black rounded-xl border border-border transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
          >
            <Download size={16} /> Export Markdown
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserReviewDetails;

