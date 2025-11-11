
import React from 'react';
import { Agent } from '../../types';
import { BotIcon, ZapIcon } from '../icons/Icons';

interface CreatorProfileHeaderProps {
    creator: Agent['creator'];
    agents: Agent[];
}

const CreatorProfileHeader: React.FC<CreatorProfileHeaderProps> = ({ creator, agents }) => {
    const totalRuns = agents.reduce((sum, agent) => sum + agent.runs, 0);

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                <img className="h-24 w-24 rounded-full" src={creator.avatarUrl} alt={creator.name} />
                <div>
                    <h1 className="text-3xl font-bold text-white">{creator.name}</h1>
                    <p className="mt-2 max-w-xl text-gray-300">{creator.bio}</p>
                    <div className="mt-4 flex justify-center gap-6 sm:justify-start">
                        <div className="flex items-center gap-2 text-gray-400">
                            <BotIcon className="h-5 w-5" />
                            <span className="font-medium text-white">{agents.length}</span> Agents
                        </div>
                         <div className="flex items-center gap-2 text-gray-400">
                            <ZapIcon className="h-5 w-5" />
                            <span className="font-medium text-white">{totalRuns.toLocaleString()}</span> Total Runs
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatorProfileHeader;
