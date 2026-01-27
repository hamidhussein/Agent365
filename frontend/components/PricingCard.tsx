// @ts-nocheck

import React from 'react';
import { Agent } from '../types';
import { CreditIcon, CheckIcon } from './icons/Icons';
import { useAuthStore } from '@/lib/store';

interface PricingCardProps {
    agent: Agent;
    onRunAgent: (agentId: string) => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ agent, onRunAgent }) => {
    const user = useAuthStore((state) => state.user);
    const isCreatorStudio = agent.source === "creator_studio";
    const isOwner = Boolean(isCreatorStudio && user?.id && agent.creator?.id === user.id);
    const primaryLabel = isCreatorStudio && isOwner ? 'Open in Creator Studio' : 'Run Agent';
    const showCreatorStudioNote = isCreatorStudio && isOwner;

    return (
        <div className="sticky top-24 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-xl shadow-xl shadow-black/5">
            <div className="flex items-baseline justify-center">
                <span className="text-5xl font-extrabold text-foreground">{agent.price}</span>
                <span className="ml-2 text-lg font-semibold text-muted-foreground">credits/run</span>
            </div>

            <div className="mt-8 space-y-4">
                {showCreatorStudioNote && (<p className="text-sm text-primary/80 font-medium text-center bg-primary/5 p-3 rounded-lg border border-primary/20">You own this Creator Studio agent. Open the studio to chat or edit.</p>)}
                <button 
                    onClick={() => onRunAgent(agent.id)}
                    className="inline-flex w-full h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 active:scale-[0.98]">
                    {primaryLabel}
                </button>
                <button disabled={isCreatorStudio && isOwner} className="inline-flex w-full h-12 items-center justify-center rounded-xl border-2 border-primary bg-transparent px-6 text-base font-bold text-primary shadow-sm transition-all hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 active:scale-[0.98]">
                    {isCreatorStudio && isOwner ? 'Demo available in Creator Studio' : 'Try Demo (3 free runs)'}
                </button>
            </div>
            
            <ul className="mt-8 space-y-4 text-sm text-muted-foreground font-medium">
                <li className="flex items-center">
                    <div className="bg-green-500/10 p-1 rounded-full mr-3 border border-green-500/20">
                        <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span>Access to full agent capabilities</span>
                </li>
                <li className="flex items-center">
                    <div className="bg-green-500/10 p-1 rounded-full mr-3 border border-green-500/20">
                        <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span>Downloadable results</span>
                </li>
                <li className="flex items-center">
                    <div className="bg-green-500/10 p-1 rounded-full mr-3 border border-green-500/20">
                        <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span>Run history saved to account</span>
                </li>
            </ul>

        </div>
    );
};

export default PricingCard;
