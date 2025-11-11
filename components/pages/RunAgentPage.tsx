

import React, { useState } from 'react';
import { Agent, AgentRunStatus } from '../../types';
import DynamicForm from '../run/DynamicForm';
import RunStatus from '../run/RunStatus';
import ResultsDisplay from '../run/ResultsDisplay';
import { runAgentStream } from '../../services/geminiService';

interface RunAgentPageProps {
    agent: Agent;
    onBackToDetail: (agentId: string) => void;
}

const RunAgentPage: React.FC<RunAgentPageProps> = ({ agent, onBackToDetail }) => {
    const [status, setStatus] = useState<AgentRunStatus>('idle');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleRunSubmit = async (data: Record<string, any>) => {
        setFormData(data);
        setStatus('running');
        setResult('');
        setError(null);
        
        try {
            const stream = runAgentStream({ model: 'gemini-2.5-flash', systemPrompt: agent.longDescription, tools: [] }, data);
            for await (const chunk of stream) {
                setResult(prev => prev + chunk);
            }
        } catch (e) {
            setError('Failed to run the agent.');
            console.error(e);
        } finally {
            setStatus('completed');
        }
    };

    const handleRunAgain = () => {
        setStatus('idle');
        setFormData({});
        setResult('');
        setError(null);
    };

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
                {/* Left Column: Input/Status */}
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
                        </div>
                    )}
                </div>

                {/* Right Column: Output/Result */}
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 min-h-[400px]">
                    {status === 'idle' && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                             <h3 className="text-lg font-semibold text-gray-400">Awaiting Input</h3>
                            <p>The agent's results will appear here.</p>
                        </div>
                    )}
                    {status === 'running' && !result && <RunStatus />}
                    {(result || status === 'completed') && <ResultsDisplay result={result || 'Agent produced no output.'} error={error} onRunAgain={handleRunAgain} isStreaming={status === 'running'}/>}
                </div>
            </div>
        </div>
    );
};

export default RunAgentPage;
