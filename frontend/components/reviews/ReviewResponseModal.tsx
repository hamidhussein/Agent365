// @ts-nocheck
import React, { useState } from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';

interface ReviewResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responseNote: string, updatedOutputs?: any) => Promise<void>;
  review: {
    id: string;
    agent: { name: string };
    user_username: string;
    review_request_note: string;
    inputs: any;
    outputs: any;
  };
}

const ReviewResponseModal: React.FC<ReviewResponseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  review,
}) => {
  const [responseNote, setResponseNote] = useState('');
  const [refinedOutputsStr, setRefinedOutputsStr] = useState('');
  const [activeTab, setActiveTab] = useState<'note' | 'refine'>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Initialize refined output when modal opens
  React.useEffect(() => {
    if (isOpen && review) {
      setRefinedOutputsStr(
        review.outputs 
          ? JSON.stringify(review.outputs, null, 2) 
          : '{\n  "output": ""\n}'
      );
    }
  }, [isOpen, review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNote.trim()) {
      setError('Please provide a response');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let refinedData = undefined;
      // If we are in refine tab OR if the content is different, try to parse
      if (activeTab === 'refine' || refinedOutputsStr.trim()) {
          try {
             refinedData = JSON.parse(refinedOutputsStr);
          } catch (e) {
             setError('Invalid JSON in Refined Output');
             setIsSubmitting(false);
             return;
          }
      }

      await onSubmit(responseNote, refinedData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Respond to Review</h2>
              <p className="text-xs text-gray-400">
                Agent: {review.agent?.name} • User: @{review.user_username}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-6 pb-2">
            <div className="flex bg-gray-800 p-1 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('note')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'note' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Response Note
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('refine')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'refine' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Refine Output <span className="text-[9px] bg-purple-500 text-white px-1 rounded ml-1">PRO</span>
                </button>
            </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          {/* Context - Only show in 'note' tab to save space? Or always? Let's show always but collapsed maybe. For now keep original layout logic but conditional. */}
          {activeTab === 'note' && (
              <>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                    User's Request
                    </label>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <p className="text-white text-sm leading-relaxed">
                        {review.review_request_note || 'No note provided'}
                    </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        User Input
                    </label>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(review.inputs, null, 2)}
                        </pre>
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Agent Output
                    </label>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(review.outputs, null, 2)}
                        </pre>
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Response *
                    </label>
                    <textarea
                    autoFocus
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder="Explain what you've done to address their concern..."
                    className="w-full h-40 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all resize-none"
                    />
                </div>
              </>
          )}

          {activeTab === 'refine' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                      <p className="text-sm text-purple-200">
                          <strong>Pro Feature:</strong> You can edit the agent's output directly. This verified version will be shown to the user alongside the original.
                      </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Refined Output (JSON)
                    </label>
                    <textarea
                        value={refinedOutputsStr}
                        onChange={(e) => setRefinedOutputsStr(e.target.value)}
                        className="w-full h-96 bg-gray-950 border border-gray-700 rounded-xl p-4 text-xs font-mono text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                        spellCheck={false}
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                    Note/Changelog
                    </label>
                    <textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder="Briefly mention what you fixed (e.g., 'Corrected the calculation logic')..."
                    className="w-full h-20 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all resize-none"
                    />
                </div>
              </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !responseNote.trim()}
              className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'refine' ? 'bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/20' : 'bg-brand-primary hover:bg-brand-primary/90 hover:shadow-brand-primary/20'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {activeTab === 'refine' ? 'Submit Refined Version' : 'Send Response'}
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
