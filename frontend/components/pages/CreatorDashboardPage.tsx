import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CreatorStats from '../creator/CreatorStats';

import MyAgentsList from '../creator/MyAgentsList';
import { Page } from '../../App';
import { creatorApi } from '@/lib/api/creator';
import { useAuthStore } from '@/lib/store';
import { mapBackendAgent, BackendAgent } from '@/lib/utils/agentMapper';

interface CreatorDashboardPageProps {
    setCurrentPage: (page: Page) => void;
    onSelectAgent: (agentId: string) => void;
}

const CreatorDashboardPage: React.FC<CreatorDashboardPageProps> = ({ setCurrentPage, onSelectAgent }) => {
    const user = useAuthStore((state) => state.user);

    const { data: agentsResponse, isLoading } = useQuery({
        queryKey: ['creatorAgents', user?.id],
        queryFn: () => creatorApi.getAgents('me'),
        enabled: !!user,
    });

    const myAgents = (agentsResponse?.data?.data || []).map((agent: any) => mapBackendAgent(agent as BackendAgent));

    const stats = {
        totalAgents: myAgents.length,
        totalRuns: myAgents.reduce((acc: number, agent: any) => acc + agent.runs, 0),
        totalEarnings: myAgents.reduce((acc: number, agent: any) => acc + (agent.runs * agent.price), 0),
        avgRating: myAgents.length > 0
            ? myAgents.reduce((acc: number, agent: any) => acc + agent.rating, 0) / myAgents.length
            : 0,
    };

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Creator Dashboard</h1>
                <p className="mt-2 text-lg text-muted-foreground">Manage your agents, view your earnings, and track your performance.</p>
            </div>

            <CreatorStats stats={stats} />

            <div className="mt-10">
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading your agents...</div>
                ) : (
                    <MyAgentsList agents={myAgents} onNavigate={setCurrentPage} onSelectAgent={onSelectAgent} />
                )}
            </div>
        </div>
    );
};

export default CreatorDashboardPage;
