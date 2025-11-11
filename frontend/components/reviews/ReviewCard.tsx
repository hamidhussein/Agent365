
import React from 'react';
import { Review } from '../../types';
import { StarIcon } from '../icons/Icons';

interface ReviewCardProps {
    review: Review;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
            <StarIcon
                key={i}
                className={`h-4 w-4 ${i < rating ? 'text-yellow-400' : 'text-gray-600'}`}
            />
        ))}
    </div>
);

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
    return (
        <div className="flex items-start space-x-4">
            <img className="h-10 w-10 rounded-full" src={review.user.avatarUrl} alt={review.user.name} />
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">{review.user.name}</p>
                        <p className="text-xs text-gray-500">{review.date}</p>
                    </div>
                    <StarRating rating={review.rating} />
                </div>
                <p className="mt-2 text-gray-300">{review.comment}</p>
            </div>
        </div>
    );
};

export default ReviewCard;
