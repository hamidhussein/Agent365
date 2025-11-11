
import React from 'react';
import { Review } from '../../types';
import ReviewCard from './ReviewCard';

interface ReviewListProps {
    reviews: Review[];
    totalReviews: number;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, totalReviews }) => {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 rounded-lg border-2 border-dashed border-gray-700">
                <h3 className="text-lg font-semibold text-white">No Reviews Yet</h3>
                <p className="mt-1 text-sm text-gray-400">Be the first to leave a review for this agent!</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-400">
                Showing {reviews.length} of {totalReviews.toLocaleString()} reviews
            </p>
            {reviews.map(review => (
                <ReviewCard key={review.id} review={review} />
            ))}
            {totalReviews > reviews.length && (
                 <div className="text-center">
                    <button className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80">
                        Load More Reviews
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewList;
