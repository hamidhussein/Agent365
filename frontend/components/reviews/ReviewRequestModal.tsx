import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle, CreditCard, Loader2, ArrowRight, ArrowLeft, Zap, Clock, Sparkles } from 'lucide-react';

interface ReviewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (note: string, priority?: 'standard' | 'high') => Promise<void>;
    agentName: string;
    reviewCost?: number;
}

type Priority = 'standard' | 'high';
type Step = 1 | 2;

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    agentName, 
    reviewCost = 0
}) => {
    const [step, setStep] = useState<Step>(1);
    const [note, setNote] = useState('');
    const [priority, setPriority] = useState<Priority>('standard');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const priorityMultiplier = priority === 'high' ? 2 : 1;
    const finalCost = reviewCost * priorityMultiplier;

    if (!isOpen) return null;

    const handleNext = () => {
        if (!note.trim()) {
            setError('Please describe what you need help with.');
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setError(null);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(note, priority);
            setIsSuccess(true);
        } catch (err: any) {
            let msg = err.message || 'Failed to submit review request.';
            if (typeof msg === 'string' && msg.trim().startsWith('{')) {
                try { msg = JSON.parse(msg).detail || msg; } catch {}
            }
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setNote('');
        setPriority('standard');
        setIsSuccess(false);
        setError(null);
        onClose();
    };

    // Success State
    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={handleClose}>
                <div className="bg-card border border-border rounded-3xl max-w-md w-full p-10 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                    <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-8 ring-4 ring-green-500/20">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight">Request Submitted!</h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        The expert for <span className="text-foreground font-bold">{agentName}</span> has been notified. 
                        {priority === 'high' && <span className="text-primary font-bold"> Your HIGH PRIORITY request will be handled first.</span>}
                    </p>
                    <button 
                        onClick={handleClose}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs active:scale-[0.98]"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={handleClose}>
            <div className="bg-card border border-border rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header with Stepper */}
                <div className="px-8 py-6 bg-muted/30 border-b border-border">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-foreground tracking-tight">Request Expert Review</h2>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Agent: {agentName}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-2 rounded-xl">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 1 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
                            Describe
                        </div>
                        <ArrowRight size={16} className="text-border" />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 2 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
                            Confirm
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                    What do you need help with? *
                                </label>
                                <textarea
                                    autoFocus
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="e.g., The calculation seems incorrect, can you verify and fix it?"
                                className="w-full h-28 bg-muted/30 border-2 border-border rounded-2xl px-5 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none font-medium leading-relaxed text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                                    Tip: Be specific. Include context, expected outcome, and what went wrong.
                                </p>
                            </div>

                            {/* Priority Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                    Priority Level
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setPriority('standard')}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${priority === 'standard' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border hover:border-primary/30 bg-muted/20'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock size={20} className={priority === 'standard' ? 'text-primary' : 'text-muted-foreground'} />
                                            <span className="text-sm font-black text-foreground uppercase tracking-widest">Standard</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium">Response within 24-48 hours</p>
                                        <p className="text-lg font-black text-foreground mt-1">{reviewCost} Credits</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPriority('high')}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${priority === 'high' ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' : 'border-border hover:border-amber-500/30 bg-muted/20'}`}
                                    >
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[8px] bg-amber-500 text-black font-black px-2 py-0.5 rounded-full uppercase">Fast</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap size={20} className={priority === 'high' ? 'text-amber-500' : 'text-muted-foreground'} />
                                            <span className="text-sm font-black text-foreground uppercase tracking-widest">High Priority</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium">Response within 4-12 hours</p>
                                        <p className="text-lg font-black text-foreground mt-1">{reviewCost * 2} Credits</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            {/* Summary */}
                            <div className="bg-muted/30 rounded-2xl p-6 border border-border space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Your Request</label>
                                    <p className="text-sm text-foreground font-medium italic leading-relaxed">"{note}"</p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                    <div>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Priority</label>
                                        <div className={`flex items-center gap-2 ${priority === 'high' ? 'text-amber-500' : 'text-primary'}`}>
                                            {priority === 'high' ? <Zap size={16} /> : <Clock size={16} />}
                                            <span className="font-black uppercase text-sm">{priority === 'high' ? 'High Priority' : 'Standard'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Total Cost</label>
                                        <p className="text-2xl font-black text-foreground">{finalCost} <span className="text-sm text-muted-foreground">Credits</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Confirmation */}
                            <div className="flex items-center gap-4 px-5 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400">
                                <CreditCard className="w-6 h-6 shrink-0" />
                                <p className="text-sm font-medium">
                                    <span className="font-black">{finalCost} Credits</span> will be deducted from your balance when you confirm.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm font-bold flex items-center gap-3">
                            <div className="w-2 h-2 bg-destructive rounded-full"></div>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-muted/10 border-t border-border flex gap-4 shrink-0">
                    {step === 1 ? (
                        <>
                            <button 
                                type="button"
                                onClick={handleClose}
                                className="flex-1 py-4 bg-muted/50 hover:bg-muted text-foreground font-black rounded-2xl border border-border transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleNext}
                                disabled={!note.trim()}
                                className="flex-[2] py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                type="button"
                                onClick={handleBack}
                                className="flex-1 py-4 bg-muted/50 hover:bg-muted text-foreground font-black rounded-2xl border border-border transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-[2] py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Confirm & Submit
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewRequestModal;

