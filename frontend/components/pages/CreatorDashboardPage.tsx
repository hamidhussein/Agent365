import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CreatorStats from '../creator/CreatorStats';

import MyAgentsList from '../creator/MyAgentsList';
import AgentGrid from '../AgentGrid';
import { Page } from '../../App';
import { creatorApi } from '@/lib/api/creator';
import { useAuthStore } from '@/lib/store';
import { mapBackendAgent, BackendAgent } from '@/lib/utils/agentMapper';
import { PlusCircleIcon } from '../icons/Icons';

interface CreatorDashboardPageProps {
    setCurrentPage: (page: Page) => void;
    onSelectAgent: (agentId: string) => void;
}

const CreatorDashboardPage: React.FC<CreatorDashboardPageProps> = ({ setCurrentPage, onSelectAgent }) => {
    const user = useAuthStore((state) => state.user);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
                    <>
                        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-2xl font-semibold text-foreground">My Agents</h2>
                                <p className="text-sm text-muted-foreground">Manage and optimize your published agents.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center rounded-lg border border-input bg-background p-1 text-xs font-semibold text-muted-foreground">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        aria-pressed={viewMode === 'grid'}
                                        className={`rounded-md px-3 py-1.5 transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary hover:text-foreground'}`}
                                    >
                                        Grid
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        aria-pressed={viewMode === 'list'}
                                        className={`rounded-md px-3 py-1.5 transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary hover:text-foreground'}`}
                                    >
                                        List
                                    </button>
                                </div>
                                <button
                                    onClick={() => setCurrentPage('createAgent')}
                                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                                    Create New Agent
                                </button>
                            </div>
                        </div>

                        {viewMode === 'list' ? (
                            <MyAgentsList agents={myAgents} onNavigate={setCurrentPage} onSelectAgent={onSelectAgent} showHeader={false} />
                        ) : (
                            <AgentGrid
                                agents={myAgents}
                                onSelectAgent={onSelectAgent}
                                onSelectCreator={() => {}}
                                favoriteAgentIds={new Set()}
                                onToggleFavorite={() => {}}
                                showFavorite={false}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CreatorDashboardPage;
