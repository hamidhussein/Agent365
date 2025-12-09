import axiosInstance from './client';

export interface ReviewCreate {
    agent_id: string;
    rating: number;
    title: string;
    comment: string;
}

export interface Review {
    id: string;
    user_id: string;
    agent_id: string;
    rating: number;
    title: string;
    comment: string;
    helpful_count: number;
    created_at: string;
    updated_at: string;
}

export const fetchAgentReviews = async (agentId: string): Promise<any[]> => {
    const response = await axiosInstance.get<Review[]>(`/reviews`, {
        params: { agent_id: agentId }
    });

    // Transform backend reviews to frontend format
    return response.data.map(review => ({
        id: review.id,
        user: {
            name: `User ${review.user_id.substring(0, 8)}`, // Placeholder - ideally fetch user data
            avatarUrl: '', // Placeholder
        },
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        date: review.created_at,
        helpfulCount: review.helpful_count,
    }));
};

export const createReview = async (data: ReviewCreate): Promise<Review> => {
    const response = await axiosInstance.post<Review>('/reviews', data);
    return response.data;
};

export const updateReview = async (id: string, data: Partial<ReviewCreate>): Promise<Review> => {
    const response = await axiosInstance.put<Review>(`/reviews/${id}`, data);
    return response.data;
};

export const deleteReview = async (id: string): Promise<void> => {
    await axiosInstance.delete(`/reviews/${id}`);
};
