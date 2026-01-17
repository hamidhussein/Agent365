import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle, CreditCard, Loader2 } from 'lucide-react';

interface ReviewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (note: string) => Promise<void>;
    agentName: string;
    reviewCost?: number;
}

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    agentName, 
    reviewCost 
}) => {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) {
            setError('Please provide a note for the creator.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(note);
            setIsSuccess(true);
        } catch (err: any) {
            let msg = err.message || 'Failed to submit review request. Please try again.';
            // Catch cases where the message itself might be a JSON string
            if (typeof msg === 'string' && msg.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(msg);
                    msg = parsed.message || parsed.detail || msg;
                } catch (e) {
                    // Ignore parsing error
                }
            }
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="mx-auto w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Review Requested!</h2>
                    <p className="text-gray-400 mb-8">
                        The creator of <span className="text-white font-semibold">{agentName}</span> will be notified. 
                        You'll see the expert's response here once it's ready.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-brand-primary/20"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Request Expert Review</h2>
                            <p className="text-xs text-gray-400">Agent: {agentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Message to Creator
                        </label>
                        <textarea
                            autoFocus
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Explain what you need help with or what results you'd like to improve..."
                            className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all resize-none"
                        />
                        <p className="mt-2 text-[11px] text-gray-500 italic">
                            Helpful details make it easier for the creator to provide a better response.
                        </p>
                    </div>

                    {reviewCost !== undefined && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/10 border border-amber-800/30 rounded-xl text-amber-400">
                            <CreditCard className="w-5 h-5 shrink-0" />
                            <div className="text-sm">
                                <span className="font-semibold">{reviewCost} Credits</span> will be deducted once the review is submitted.
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !note.trim()}
                            className="flex-[2] py-3 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-brand-primary/20 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewRequestModal;
