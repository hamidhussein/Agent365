
import React from 'react';
import CreatorStats from '../creator/CreatorStats';
import MyAgentsList from '../creator/MyAgentsList';
import { mockCreatorStats, mockAgents } from '../../constants';
import { Page } from '../../App';

interface CreatorDashboardPageProps {
    setCurrentPage: (page: Page) => void;
    onSelectAgent: (agentId: string) => void;
}

const CreatorDashboardPage: React.FC<CreatorDashboardPageProps> = ({ setCurrentPage, onSelectAgent }) => {
    // For now, we assume all agents belong to the current creator for demonstration.
    const myAgents = mockAgents; 

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Creator Dashboard</h1>
                <p className="mt-2 text-lg text-gray-400">Manage your agents, view your earnings, and track your performance.</p>
            </div>
            
            <CreatorStats stats={mockCreatorStats} />

            <div className="mt-10">
                <MyAgentsList agents={myAgents} onNavigate={setCurrentPage} onSelectAgent={onSelectAgent} />
            </div>
        </div>
    );
};

export default CreatorDashboardPage;
