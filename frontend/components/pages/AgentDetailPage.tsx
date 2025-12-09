
import React from 'react';
import { Agent } from '../../types';
import AgentHeader from '../AgentHeader';
import PricingCard from '../PricingCard';
import ReviewList from '../reviews/ReviewList';
import ReviewForm from '../reviews/ReviewForm';
import { ClockIcon, TrendingUpIcon, ZapIcon } from '../icons/Icons';
import { useQuery } from '@tanstack/react-query';
import { fetchAgentReviews } from '@/lib/api/reviews';

interface AgentDetailPageProps {
    agent: Agent;
    onRunAgent: (agentId: string) => void;
    onSelectCreator: (username: string) => void;
    isFavorited: boolean;
    onToggleFavorite: (agentId: string) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center space-x-3">
            <div className="text-brand-primary">{icon}</div>
            <div>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);


const AgentDetailPage: React.FC<AgentDetailPageProps> = ({ agent, onRunAgent, onSelectCreator, isFavorited, onToggleFavorite }) => {
    // Fetch real reviews from API
    const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
        queryKey: ['reviews', agent.id],
        queryFn: () => fetchAgentReviews(agent.id),
        staleTime: 30 * 1000, // 30 seconds
    });

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                {/* Left/Main Column */}
                <div className="lg:col-span-2">
                    <AgentHeader
                        agent={agent}
                        onSelectCreator={onSelectCreator}
                        isFavorited={isFavorited}
                        onToggleFavorite={onToggleFavorite}
                    />

                    <div className="mt-8">
                        <h2 className="text-xl font-bold text-white">Description</h2>
                        <p className="mt-4 whitespace-pre-wrap text-gray-300 leading-relaxed">
                            {agent.longDescription}
                        </p>
                    </div>

                    <div className="mt-10">
                        <h2 className="mb-4 text-xl font-bold text-white">Agent Stats</h2>
                        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <StatCard icon={<ZapIcon className="h-6 w-6" />} label="Total Runs" value={agent.runs.toString()} />
                            <StatCard icon={<TrendingUpIcon className="h-6 w-6" />} label="Success Rate" value={`${agent.successRate}%`} />
                            <StatCard icon={<ClockIcon className="h-6 w-6" />} label="Avg. Run Time" value={`${agent.avgRunTime}s`} />
                        </div>
                    </div>

                    <div className="mt-10 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                        <h2 className="text-xl font-bold text-white">About the Creator</h2>
                        <div className="mt-4 flex items-start space-x-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-lg font-bold text-white">
                                {agent.creator.name.charAt(0)}
                            </div>
                            <div>
                                <button onClick={() => onSelectCreator(agent.creator.username)} className="text-lg font-semibold text-white hover:underline">{agent.creator.name}</button>
                                <p className="mt-1 text-gray-400">{agent.creator.bio}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10">
                        <h2 className="mb-4 text-xl font-bold text-white">Reviews ({reviews.length})</h2>
                        <div className="space-y-8">
                            <ReviewForm agentId={agent.id} />
                            {reviewsLoading ? (
                                <div className="text-center py-8 text-gray-400">Loading reviews...</div>
                            ) : (
                                <ReviewList reviews={reviews} totalReviews={reviews.length} />
                            )}
                        </div>
                    </div>

                </div>

                {/* Right/Sidebar Column */}
                <aside className="lg:col-span-1">
                    <PricingCard agent={agent} onRunAgent={onRunAgent} />
                </aside>
            </div>
        </div>
    );
};

export default AgentDetailPage;
