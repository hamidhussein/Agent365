
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../src/lib/api/client';
import { StarIcon, ZapIcon } from './icons/Icons';
import { mapBackendAgent } from '../src/lib/utils/agentMapper';

interface AgentGraphProps {
    currentAgentId: string;
    creatorId: string;
    creatorName: string;
    onSelectAgent: (agentId: string) => void;
}

const AgentGraph: React.FC<AgentGraphProps> = ({ currentAgentId, creatorId, creatorName, onSelectAgent }) => {
    const { data: agents = [], isLoading } = useQuery({
        queryKey: ['creator-agents', creatorId],
        queryFn: async () => {
            let creatorAgents: any[] = [];
            
            // 1. Fetch agents from the same creator
            if (creatorId) {
                const response = await api.agents.list({
                    creator_id: creatorId,
                    sort_by: 'popular',
                    limit: 10,
                    source: 'all',
                    include_creator_studio_public: true,
                });
                const data = (response.data as any).data || response.data;
                if (Array.isArray(data)) {
                    creatorAgents = data
                        .map((a: any) => mapBackendAgent(a))
                        .filter(a => a.id !== currentAgentId);
                }
            }

            // 2. Decide what to return
            // If the creator has other agents, show ONLY those (up to 5)
            if (creatorAgents.length > 0) {
                return creatorAgents.slice(0, 5);
            }

            // 3. Fallback: If ZERO agents from this creator, recommend top popular ones
            const popularResponse = await api.agents.list({
                sort_by: 'popular',
                limit: 10,
                source: 'all',
                include_creator_studio_public: true,
            });
            const popularData = (popularResponse.data as any).data || popularResponse.data;
            if (Array.isArray(popularData)) {
                return popularData
                    .map((a: any) => mapBackendAgent(a))
                    .filter(a => a.id !== currentAgentId)
                    .slice(0, 5);
            }
            
            return [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="mt-16 animate-pulse">
                <div className="h-8 w-48 rounded bg-muted/70 mb-8"></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-40 rounded-xl bg-card/60 border border-border"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (agents.length === 0) return null;
    const hasOnlyCreatorAgents = agents.every(a => a.creator.id === creatorId);

    return (
        <section className="mt-20 relative overflow-hidden pb-12">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Agent Graph</h2>
                        <p className="text-muted-foreground mt-1">
                            {hasOnlyCreatorAgents 
                                ? <>Discover more excellence from <span className="text-primary font-medium">{creatorName}</span></>
                                : <>Discover more of our <span className="text-primary font-medium">top-rated agents</span></>
                            }
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 relative">
                    {/* SVG Connector Lines (Decorative) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" style={{ zIndex: -1 }}>
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
                                <stop offset="50%" stopColor="rgba(99, 102, 241, 0.3)" />
                                <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                            </linearGradient>
                        </defs>
                        <path d="M 0 80 Q 500 80 1000 80" stroke="url(#line-gradient)" strokeWidth="1" fill="transparent" />
                        <path d="M 0 160 Q 500 160 1000 160" stroke="url(#line-gradient)" strokeWidth="1" fill="transparent" />
                    </svg>

                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            onClick={() => onSelectAgent(agent.id)}
                            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-2xl hover:shadow-primary/10"
                        >
                            {/* Card Content */}
                            <div className="relative h-24 mb-4 overflow-hidden rounded-lg">
                                <img 
                                    src={agent.imageUrl || '/placeholder-agent.png'} 
                                    alt={agent.name} 
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-bold text-white">
                                    <div className="flex items-center bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded">
                                        <StarIcon className="h-2.5 w-2.5 text-yellow-500 mr-1" />
                                        {agent.rating}
                                    </div>
                                    <div className="bg-primary/90 text-primary-foreground backdrop-blur-md px-1.5 py-0.5 rounded">
                                        {agent.price} cr
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{agent.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{agent.description}</p>
                            
                            <div className="mt-4 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center text-[10px] text-muted-foreground">
                                    <ZapIcon className="h-3 w-3 mr-1 text-primary" />
                                    {agent.runs.toLocaleString()} runs
                                </div>
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary transition-colors">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Hover Accent */}
                            <div className="absolute top-0 left-0 w-1 h-0 bg-primary transition-all duration-300 group-hover:h-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AgentGraph;
