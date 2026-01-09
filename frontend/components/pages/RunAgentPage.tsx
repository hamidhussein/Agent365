
import React, { useEffect, useState } from 'react';
import { Agent, AgentRunStatus } from '../../types';
import DynamicForm from '../run/DynamicForm';
import RunStatus from '../run/RunStatus';
import RichResultDisplay from '../run/RichResultDisplay';
import { api } from '../../src/lib/api/client';
import SEOReport from '../run/SEOReport';
import { ChatInterface } from '../../creator-studio/components/chat/ChatInterface';
import type { Agent as CreatorStudioAgent } from '../../creator-studio/types';
import { publicApi } from '../../creator-studio/api';
import { useAuthStore } from '../../src/lib/store';

interface RunAgentPageProps {
    agent: Agent;
    onBackToDetail: (agentId: string) => void;
}

const getGuestId = () => {
    const stored = localStorage.getItem('agentgrid_guest_id');
    if (stored) return stored;
    let nextId = '';
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        nextId = crypto.randomUUID();
    } else {
        nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    localStorage.setItem('agentgrid_guest_id', nextId);
    return nextId;
};

const RunAgentPage: React.FC<RunAgentPageProps> = ({ agent, onBackToDetail }) => {
    const login = useAuthStore((state) => state.login);
    const user = useAuthStore((state) => state.user);

    const [status, setStatus] = useState<AgentRunStatus>('idle');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [result, setResult] = useState<string>('');
    const [resultObj, setResultObj] = useState<any>(null); // Store raw object
    const [error, setError] = useState<string | null>(null);

    // Creator Studio public chat state
    const [csAgent, setCsAgent] = useState<CreatorStudioAgent | null>(null);
    const [csCredits, setCsCredits] = useState<number>(0);
    const [csLoading, setCsLoading] = useState<boolean>(false);
    const [csError, setCsError] = useState<string | null>(null);
    const [guestId] = useState<string>(getGuestId());

    const isCreatorStudioOwner =
        agent.source === 'creator_studio' && user?.id && agent.creator?.id === user.id;

    useEffect(() => {
        if (agent.source !== 'creator_studio' || isCreatorStudioOwner) return;
        const load = async () => {
            setCsLoading(true);
            setCsError(null);
            try {
                const list = await publicApi.listPublicAgents();
                const target = list.find((item) => item.id === agent.id) || null;
                if (!target) {
                    setCsError('This public agent is not available.');
                    setCsAgent(null);
                } else {
                    setCsAgent(target);
                }
                try {
                    const creditsRes = await publicApi.getCredits(guestId);
                    setCsCredits(creditsRes.credits);
                } catch {
                    setCsCredits(0);
                }
            } catch (err: any) {
                setCsError(err?.message || 'Unable to load agent.');
                setCsAgent(null);
            } finally {
                setCsLoading(false);
            }
        };
        load();
    }, [agent.id, agent.source, guestId, isCreatorStudioOwner]);

    // Owner: prompt to open Creator Studio
    if (isCreatorStudioOwner) {
        return (
            <div className="container mx-auto max-w-screen-2xl px-4 py-12">
                <button
                    onClick={() => onBackToDetail(agent.id)}
                    className="text-sm text-gray-400 hover:text-white mb-4"
                >
                    &larr; Back to Agent Details
                </button>
                <div className="rounded-lg border border-blue-700 bg-blue-900/30 p-6 text-blue-100">
                    <h2 className="text-2xl font-bold text-white">Open in Creator Studio</h2>
                    <p className="mt-2 text-sm">
                        You own this Creator Studio agent. Open the Creator Studio workspace to chat or edit it.
                    </p>
                    <div className="mt-4 flex gap-3">
                        <button
                            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => window.location.assign('/creator-studio')}
                        >
                            Open Creator Studio
                        </button>
                        <button
                            className="rounded-md border border-gray-600 px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => onBackToDetail(agent.id)}
                        >
                            Back to details
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Non-owner: show Creator Studio public chat UI
    if (agent.source === 'creator_studio') {
        if (csLoading) {
            return (
                <div className="container mx-auto max-w-screen-2xl px-4 py-12">
                    <button
                        onClick={() => onBackToDetail(agent.id)}
                        className="text-sm text-gray-400 hover:text-white mb-4"
                    >
                        &larr; Back to Agent Details
                    </button>
                    <div className="text-gray-300">Loading Creator Studio agent...</div>
                </div>
            );
        }
        if (csError) {
            return (
                <div className="container mx-auto max-w-screen-2xl px-4 py-12">
                    <button
                        onClick={() => onBackToDetail(agent.id)}
                        className="text-sm text-gray-400 hover:text-white mb-4"
                    >
                        &larr; Back to Agent Details
                    </button>
                    <div className="rounded-md border border-red-700 bg-red-900/30 p-6 text-red-100">
                        {csError}
                    </div>
                </div>
            );
        }
        if (csAgent) {
            const handleBuyCredits = async (amount: number) => {
                const res = await publicApi.purchaseCredits(guestId, amount);
                setCsCredits(res.credits);
            };
            const refreshCredits = async () => {
                try {
                    const res = await publicApi.getCredits(guestId);
                    setCsCredits(res.credits);
                } catch {
                    setCsCredits(0);
                }
            };
            return (
                <div className="min-h-screen bg-slate-900">
                    <div className="container mx-auto max-w-screen-2xl px-4 py-6">
                        <button
                            onClick={() => onBackToDetail(agent.id)}
                            className="text-sm text-gray-400 hover:text-white mb-4"
                        >
                            &larr; Back to Agent Details
                        </button>
                    </div>
                    <div className="max-w-screen-2xl mx-auto px-4 pb-8">
                        <ChatInterface
                            agent={csAgent}
                            onBack={() => onBackToDetail(agent.id)}
                            publicMode
                            guestId={guestId}
                            credits={csCredits}
                            onBuyCredits={handleBuyCredits}
                            onCreditsRefresh={refreshCredits}
                        />
                    </div>
                </div>
            );
        }
    }

    // Standard marketplace agents: original run UI
    const handleRunSubmit = async (data: Record<string, any>) => {
        setFormData(data);
        setStatus('running');
        setResult('');
        setResultObj(null);
        setError(null);

        try {
            const response = await api.agents.execute(agent.id, data);
            const responseData = response.data as any;
            const execution = responseData.data || responseData;

            if (!execution) {
                throw new Error('Received empty response from server.');
            }

            const outputs = execution.outputs;
            setResultObj(outputs);

            if (outputs && typeof outputs === 'object') {
                if ('response' in outputs) {
                    const resp = outputs.response;
                    setResult(typeof resp === 'object' ? JSON.stringify(resp, null, 2) : String(resp));
                } else {
                    setResult(JSON.stringify(outputs, null, 2));
                }
            } else {
                setResult(outputs !== undefined && outputs !== null ? String(outputs) : '');
            }

            try {
                const userResponse = await api.auth.getCurrentUser();
                const payload = userResponse.data as any;
                const refreshed = payload.data || payload;
                const frontendUser: any = {
                    ...refreshed,
                    name: refreshed.full_name || refreshed.username || 'User',
                    creditBalance: refreshed.credits || 0,
                    favoriteAgentIds: refreshed.favoriteAgentIds || [],
                };
                login(frontendUser);
            } catch (err) {
                console.warn('Failed to refresh user credits', err);
            }

            setStatus('completed');
        } catch (e: any) {
            const errorMessage = e.response?.data?.detail || e.message || 'Failed to run the agent.';
            setError(errorMessage);
            console.error('Agent Execution Error:', e);
            setStatus('completed');
        }
    };

    const handleRunAgain = () => {
        setStatus('idle');
        setFormData({});
        setResult('');
        setResultObj(null);
        setError(null);
    };

    const SEO_AGENT_ID = '787b599f-c8b9-42bf-affd-7fbd23a3add3';

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
            <div className="mb-8">
                <button onClick={() => onBackToDetail(agent.id)} className="text-sm text-gray-400 hover:text-white mb-2">
                    &larr; Back to Agent Details
                </button>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{agent.name}</h1>
                <p className="mt-2 text-lg text-gray-400">Provide the required inputs below to run the agent.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 h-fit">
                    {status === 'idle' && (
                        <DynamicForm schema={agent.inputSchema} onSubmit={handleRunSubmit} price={agent.price} />
                    )}
                    {(status === 'running' || status === 'completed') && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Inputs</h2>
                            <div className="space-y-3 rounded-md bg-gray-900/50 p-4">
                                {Object.entries(formData).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-400 capitalize">{key.replace(/_/g, ' ')}</label>
                                        <p className="mt-1 text-white whitespace-pre-wrap">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                            {status === 'completed' && (
                                <button
                                    onClick={handleRunAgain}
                                    className="mt-6 w-full rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600"
                                >
                                    Run Again
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={`rounded-lg border border-gray-700 bg-gray-800/50 p-6 min-h-[400px] ${
                        agent.id === SEO_AGENT_ID && resultObj ? 'lg:col-span-2' : ''
                    }`}
                >
                    {status === 'idle' && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <h3 className="text-lg font-semibold text-gray-400">Awaiting Input</h3>
                            <p>The agent's results will appear here.</p>
                        </div>
                    )}

                    {status === 'running' && !result && <RunStatus />}

                    {(result || status === 'completed') && (
                        <>
                            {agent.id === SEO_AGENT_ID && resultObj ? (
                                <SEOReport data={resultObj} />
                            ) : (
                                <RichResultDisplay
                                    result={resultObj || result}
                                    error={error}
                                    isStreaming={status === 'running'}
                                    onRunAgain={handleRunAgain}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RunAgentPage;
