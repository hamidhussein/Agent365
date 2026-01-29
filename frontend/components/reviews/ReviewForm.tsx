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
            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-border bg-card/60">
                <h3 className="text-lg font-semibold text-foreground">Sign in to write a review</h3>
                <p className="mt-1 text-sm text-muted-foreground">You must be logged in to review agents.</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-green-500/30 bg-green-500/10">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Thank you for your review!</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your feedback helps improve the community.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Write a Review</h3>

                {error && (
                    <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-sm text-destructive">
                            {(error as any)?.response?.data?.detail || 'Failed to submit review. Please try again.'}
                        </p>
                    </div>
                )}

                <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Rating</label>
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
                                    className="text-muted-foreground transition-colors"
                                >
                                    <StarIcon
                                        className={`h-6 w-6 ${(hoverRating || rating) >= starValue
                                                ? 'text-yellow-400'
                                                : 'text-muted-foreground/40'
                                            }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="block w-full rounded-md border border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                        placeholder="Summarize your experience..."
                        maxLength={255}
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Review</label>
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="block w-full rounded-md border border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                        placeholder="Share your experience with this agent..."
                    />
                </div>

                <div className="mt-4 text-right">
                    <button
                        type="submit"
                        className="inline-flex h-10 w-32 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
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
