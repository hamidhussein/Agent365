import React, { useState } from 'react';
import { StarIcon, LoadingSpinnerIcon } from '../icons/Icons';
import { createReview } from '@/lib/api/reviews';
import { useAuthStore } from '@/lib/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ReviewFormProps {
    agentId: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ agentId }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const queryClient = useQueryClient();

    const { mutate: submitReview, isPending, isSuccess, error } = useMutation({
        mutationFn: createReview,
        onSuccess: () => {
            // Invalidate and refetch reviews
            queryClient.invalidateQueries({ queryKey: ['reviews', agentId] });
            // Clear form
            setRating(0);
            setTitle('');
            setComment('');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || title.length < 3 || comment.length < 10) return;

        submitReview({
            agent_id: agentId,
            rating,
            title,
            comment,
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="text-center py-8 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
                <h3 className="text-lg font-semibold text-gray-400">Sign in to write a review</h3>
                <p className="mt-1 text-sm text-gray-500">You must be logged in to review agents.</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="text-center py-8 rounded-lg border-2 border-dashed border-green-500/50 bg-green-500/10">
                <h3 className="text-lg font-semibold text-green-400">Thank you for your review!</h3>
                <p className="mt-1 text-sm text-gray-400">Your feedback helps improve the community.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <h3 className="text-lg font-semibold text-white">Write a Review</h3>

                {error && (
                    <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/50 p-3">
                        <p className="text-sm text-red-400">
                            {(error as any)?.response?.data?.detail || 'Failed to submit review. Please try again.'}
                        </p>
                    </div>
                )}

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
                    <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, index) => {
                            const starValue = index + 1;
                            return (
                                <button
                                    type="button"
                                    key={starValue}
                                    onMouseEnter={() => setHoverRating(starValue)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(starValue)}
                                    className="text-gray-500 transition-colors"
                                >
                                    <StarIcon
                                        className={`h-6 w-6 ${(hoverRating || rating) >= starValue
                                                ? 'text-yellow-400'
                                                : 'text-gray-600'
                                            }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        placeholder="Summarize your experience..."
                        maxLength={255}
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Review</label>
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        placeholder="Share your experience with this agent..."
                    />
                </div>

                <div className="mt-4 text-right">
                    <button
                        type="submit"
                        className="inline-flex h-10 w-32 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={rating === 0 || title.length < 3 || comment.length < 10 || isPending}
                    >
                        {isPending ? <LoadingSpinnerIcon className="h-5 w-5" /> : 'Submit Review'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ReviewForm;
