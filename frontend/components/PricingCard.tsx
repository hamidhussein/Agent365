// @ts-nocheck

import React from 'react';
import { Agent } from '../types';
import { CreditIcon, CheckIcon } from './icons/Icons';

interface PricingCardProps {
    agent: Agent;
    onRunAgent: (agentId: string) => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ agent, onRunAgent }) => {
    return (
        <div className="sticky top-24 rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-lg">
            <div className="flex items-baseline justify-center">
                <span className="text-4xl font-extrabold text-white">{agent.price}</span>
                <span className="ml-1 text-xl font-medium text-gray-400">credits/run</span>
            </div>

            <div className="mt-6 space-y-3">
                <button 
                    onClick={() => onRunAgent(agent.id)}
                    className="inline-flex w-full h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900">
                    Run Agent
                </button>
                <button className="inline-flex w-full h-11 items-center justify-center rounded-md border border-brand-secondary bg-transparent px-6 text-base font-medium text-brand-secondary shadow transition-colors hover:bg-brand-secondary/10 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 focus:ring-offset-gray-900">
                    Try Demo (3 free runs)
                </button>
            </div>
            
            <ul className="mt-6 space-y-3 text-sm text-gray-300">
                <li className="flex items-center">
                    <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span>Access to full agent capabilities</span>
                </li>
                <li className="flex items-center">
                    <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span>Downloadable results</span>
                </li>
                <li className="flex items-center">
                    <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span>Run history saved to account</span>
                </li>
            </ul>

        </div>
    );
};

export default PricingCard;
