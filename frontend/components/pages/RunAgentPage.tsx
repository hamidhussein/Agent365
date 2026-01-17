
import React, { useEffect, useState } from 'react';
import { Agent, AgentRunStatus } from '../../types';
import { AgentExecution } from '../../src/lib/types';
import DynamicForm from '../run/DynamicForm';
import RunStatus from '../run/RunStatus';
import RichResultDisplay from '../run/RichResultDisplay';
import { api } from '../../src/lib/api/client';
import SEOReport from '../run/SEOReport';
import { ChatInterface } from '../../creator-studio/components/chat/ChatInterface';
import type { Agent as CreatorStudioAgent } from '../../creator-studio/types';
import { publicApi } from '../../creator-studio/api';
import { useAuthStore } from '../../src/lib/store';
import AgentGraph from '../AgentGraph';

interface RunAgentPageProps {
    agent: Agent;
    onBackToDetail: (agentId: string) => void;
    onSelectAgent: (agentId: string) => void;
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

const RunAgentPage: React.FC<RunAgentPageProps> = ({ agent, onBackToDetail, onSelectAgent }) => {
    const login = useAuthStore((state) => state.login);
    const user = useAuthStore((state) => state.user);

    const [status, setStatus] = useState<AgentRunStatus>('idle');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [result, setResult] = useState<string>('');
    const [resultObj, setResultObj] = useState<any>(null); // Store raw object
    const [refinedResultObj, setRefinedResultObj] = useState<any>(null); // Store refined object
    const [error, setError] = useState<string | null>(null);
    const [executionId, setExecutionId] = useState<string | null>(null);
    const [reviewStatus, setReviewStatus] = useState<AgentExecution['review_status']>('none');

    // Creator Studio public chat state
    const [csAgent, setCsAgent] = useState<CreatorStudioAgent | null>(null);
    const [csLoading, setCsLoading] = useState<boolean>(false);
    const [csError, setCsError] = useState<string | null>(null);
    const [guestId] = useState<string>(getGuestId());

    const isCreatorStudioOwner =
        agent.source === 'creator_studio' && user?.id && agent.creator?.id === user.id;

    const handleRequestReview = async (note: string) => {
        if (!executionId) return;
        try {
            await api.executions.requestReview(executionId, note);
            setReviewStatus('pending');
            // Optimistically update result or show toast
            alert('Review request sent! The creator has been notified.');
        } catch (err: any) {
             const msg = err?.response?.data?.detail || err.message || 'Failed to request review';
             alert(msg);
        }
    };

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
                    // Skip credits check for public chat since it's handled internally
                } catch {
                    // Skip
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

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (reviewStatus === 'pending' && executionId) {
            interval = setInterval(async () => {
                try {
                    const response = await api.executions.get(executionId);
                    const data = (response.data as any).data || response.data;
                    
                    if (data && data.review_status === 'completed') {
                        setReviewStatus('completed');
                        setResultObj(data.outputs);
                        
                        // Check for refined outputs
                        if (data.refined_outputs) {
                            setRefinedResultObj(data.refined_outputs);
                        }

                        if (data.outputs && typeof data.outputs === 'object') {
                            setResult(JSON.stringify(data.outputs, null, 2));
                        } else {
                            setResult(String(data.outputs));
                        }
                        // Optionally show a toast/alert
                        console.log("Review completed and UI updated.");
                        clearInterval(interval);
                    } else if (data && data.review_status === 'rejected') {
                        setReviewStatus('rejected');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [reviewStatus, executionId]);

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
                        You own this Creator Studio agent. Open the Creator Studio workspace to chat || edit it.
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

                <AgentGraph 
                    currentAgentId={agent.id}
                    creatorId={agent.creator?.id || ''}
                    creatorName={agent.creator?.full_name || agent.creator?.username || 'the creator'}
                    onSelectAgent={onSelectAgent}
                />
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
                        />

                        <AgentGraph 
                            currentAgentId={agent.id}
                            creatorId={agent.creator?.id || ''}
                            creatorName={agent.creator?.full_name || agent.creator?.username || 'the creator'}
                            onSelectAgent={onSelectAgent}
                        />
                    </div>
                </div>
            );
        }
    }

    const renderSeoAuditorPro = (data: any) => {
        const quickWins = Array.isArray(data.quick_wins) ? data.quick_wins : [];
        const issues = Array.isArray(data.issues) ? data.issues : [];
        const pages = Array.isArray(data.pages) ? data.pages : [];
        return (
            <div className="space-y-6">
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-900/20 p-4 text-emerald-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">Overview</h3>
                        <span className="rounded-md bg-emerald-600/80 px-3 py-1 text-sm font-semibold text-white">Score: {data.score ?? 'N/A'}</span>
                    </div>
                    <p className="mt-2 text-emerald-50">{data.summary || 'SEO audit summary unavailable.'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-500/40 bg-blue-900/20 p-4">
                        <h4 className="text-lg font-semibold text-blue-100">Quick Wins</h4>
                        {quickWins.length === 0 ? (
                            <p className="mt-2 text-blue-50/80">No quick wins detected.</p>
                        ) : (
                            <ul className="mt-2 space-y-2 text-blue-50">
                                {quickWins.slice(0, 6).map((item: string, idx: number) => (
                                    <li key={idx} className="rounded-md bg-blue-800/30 px-3 py-2 text-sm">{item}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-4">
                        <h4 className="text-lg font-semibold text-amber-100">Issues</h4>
                        {issues.length === 0 ? (
                            <p className="mt-2 text-amber-50/80">No issues detected.</p>
                        ) : (
                            <ul className="mt-2 space-y-2 text-amber-50">
                                {issues.slice(0, 6).map((item: string, idx: number) => (
                                    <li key={idx} className="rounded-md bg-amber-800/30 px-3 py-2 text-sm">{item}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {pages.length > 0 && (
                    <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-white">Top Pages</h4>
                            <span className="text-sm text-gray-300">showing up to 5</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {pages.slice(0, 5).map((page: any, idx: number) => (
                                <div key={idx} className="rounded-md border border-gray-700 bg-gray-900/60 p-3">
                                    <div className="flex items-center justify-between">
                                        <a href={page.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-300 hover:underline break-all">{page.url}</a>
                                        <span className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200">Score {Math.round(page.score || 0)}</span>
                                    </div>
                                    <p className="text-xs text-gray-300 mt-1">Title: {page.title || 'N/A'}</p>
                                    <p className="text-xs text-gray-400">H1 count: {page.h1_count ?? 0} ? Words: {page.word_count ?? 0} ? Missing alt: {page.images_without_alt ?? 0}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Standard marketplace agents: original run UI
    const handleRunSubmit = async (data: Record<string, any>) => {
        setFormData(data);
        setStatus('running');
        setResult('');
        setResultObj(null);
        setRefinedResultObj(null);
        setError(null);
        setExecutionId(null);
        setReviewStatus('none');

        try {
            const response = await api.agents.execute(agent.id, data);
            const responseData = response.data as any;
            const execution = responseData.data || responseData;

            if (!execution) {
                throw new Error('Received empty response from server.');
            }

            if (execution.id) {
                setExecutionId(execution.id);
                setReviewStatus(execution.review_status || 'none');
            }

            const outputs = execution.outputs;
            setResultObj(outputs);

            // Check if execution already has refined outputs
            if (execution.refined_outputs) {
                setRefinedResultObj(execution.refined_outputs);
            }

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
    const SEO_AUDITOR_PRO_ID = '3f3b0d3f-3af8-4e4a-9d0e-62be5285bd39';

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
                        (agent.id === SEO_AGENT_ID || agent.id === SEO_AUDITOR_PRO_ID ) && resultObj ? 'lg:col-span-2' : ''
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
                            ) : agent.id === SEO_AUDITOR_PRO_ID && resultObj ? (
                                renderSeoAuditorPro(resultObj)
                            ) : (
                                <RichResultDisplay
                                    result={resultObj || result}
                                    refinedResult={refinedResultObj}
                                    error={error}
                                    isStreaming={status === 'running'}
                                    onRunAgain={handleRunAgain}
                                    onRequestReview={handleRequestReview}
                                    reviewStatus={reviewStatus}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            <AgentGraph 
                currentAgentId={agent.id}
                creatorId={agent.creator?.id || ''}
                creatorName={agent.creator?.full_name || agent.creator?.username || 'the creator'}
                onSelectAgent={onSelectAgent}
            />
        </div>
    );
};

export default RunAgentPage;
