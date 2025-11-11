

import React, { useState } from 'react';
import { StarIcon, LoadingSpinnerIcon } from '../icons/Icons';

const ReviewForm: React.FC = () => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || comment.length < 10) return;
        
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSubmitted(true);
            // In a real app, you would clear the form after successful submission
            // setComment('');
            // setRating(0);
        }, 1500);
    };

    if (isSubmitted) {
        return (
            <div className="text-center py-8 rounded-lg border-2 border-dashed border-green-500/50 bg-green-500/10">
                <h3 className="text-lg font-semibold text-green-400">Thank you for your review!</h3>
                <p className="mt-1 text-sm text-gray-400">Your feedback helps improve the community.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <h3 className="text-lg font-semibold text-white">Write a Review</h3>
                <div className="mt-4">
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
                                        className={`h-6 w-6 ${
                                            (hoverRating || rating) >= starValue
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
                        disabled={rating === 0 || comment.length < 10 || isSubmitting}
                    >
                        {isSubmitting ? <LoadingSpinnerIcon className="h-5 w-5" /> : 'Submit Review'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ReviewForm;
