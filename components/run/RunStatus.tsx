
import React, { useState, useEffect } from 'react';
import { BotIcon } from '../icons/Icons';

const STATUS_MESSAGES = [
    "Initializing agent environment...",
    "Analyzing input parameters...",
    "Querying language model...",
    "Processing tool outputs...",
    "Compiling final response...",
    "Finalizing results...",
];

const RunStatus: React.FC = () => {
    const [statusIndex, setStatusIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const statusInterval = setInterval(() => {
            setStatusIndex(prev => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
        }, 750);

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + (100 / (STATUS_MESSAGES.length * 0.75)), 99));
        }, 100);

        return () => {
            clearInterval(statusInterval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <BotIcon className="h-12 w-12 text-brand-primary animate-bounce" />
            <h2 className="mt-4 text-xl font-semibold text-white">Agent is Running</h2>
            <p className="mt-2 text-gray-400 text-center">Please wait while we process your request.</p>

            <div className="w-full mt-8">
                <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-brand-primary rounded-full transition-all duration-500 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="mt-3 text-center text-sm text-gray-300">
                    {STATUS_MESSAGES[statusIndex]}
                </div>
            </div>
        </div>
    );
};

export default RunStatus;
