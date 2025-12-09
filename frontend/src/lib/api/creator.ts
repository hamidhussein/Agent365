import axiosInstance from './client';
import { Agent, ApiResponse, PaginatedResponse } from '@/lib/types';

export const creatorApi = {
    getAgents: (creatorId: string = 'me') =>
        axiosInstance.get<PaginatedResponse<Agent>>('/agents', {
            params: { creator_id: creatorId },
        }),

    createAgent: (data: Partial<Agent>) =>
        axiosInstance.post<ApiResponse<Agent>>('/agents', data),

    updateAgent: (id: string, data: Partial<Agent>) =>
        axiosInstance.patch<ApiResponse<Agent>>(`/agents/${id}`, data),

    deleteAgent: (id: string) =>
        axiosInstance.delete(`/agents/${id}`),

    getAgentAnalytics: (id: string) =>
        axiosInstance.get<ApiResponse<any>>(`/analytics/agent/${id}`),
};
