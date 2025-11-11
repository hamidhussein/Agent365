import React, { useState, useEffect } from 'react';
import { ClipboardIcon, CheckIcon, AlertTriangleIcon } from '../icons/Icons';

interface ResultsDisplayProps {
    result: string;
    error: string | null;
    onRunAgain: () => void;
    isStreaming: boolean;
}

const BlinkingCursor: React.FC = () => (
    <span className="inline-block w-2 h-4 bg-gray-200 animate-pulse ml-1" />
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, error, onRunAgain, isStreaming }) => {
    const [copied, setCopied] = useState(false);
    const [formattedResult, setFormattedResult] = useState('');

    useEffect(() => {
        let finalResult = result;
        try {
            // Try to parse it as we stream. This is imperfect but works for many cases.
            const parsed = JSON.parse(result);
            finalResult = JSON.stringify(parsed, null, 2);
        } catch (e) {
            // It's not a valid JSON string (yet or ever), display as is.
        }
        setFormattedResult(finalResult);
    }, [result]);

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Results</h2>
                <button
                    onClick={handleCopy}
                    disabled={isStreaming || !!error}
                    className="flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {copied ? (
                        <>
                            <CheckIcon className="h-4 w-4 text-green-400" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="h-4 w-4" />
                            Copy
                        </>
                    )}
                </button>
            </div>
            {error ? (
                 <div className="flex-grow rounded-md bg-red-500/10 p-4 overflow-auto border border-red-500/30 flex flex-col items-center justify-center text-center">
                    <AlertTriangleIcon className="h-8 w-8 text-red-400" />
                    <h3 className="mt-2 text-lg font-semibold text-red-400">An Error Occurred</h3>
                    <p className="text-sm text-gray-300">{error}</p>
                 </div>
            ) : (
                <div className="flex-grow rounded-md bg-gray-900/50 p-4 overflow-auto border border-gray-700">
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                        <code>{formattedResult}</code>
                        {isStreaming && <BlinkingCursor />}
                    </pre>
                </div>
            )}
            <div className="mt-6">
                <button
                    onClick={onRunAgain}
                    disabled={isStreaming}
                     className="inline-flex w-full h-11 items-center justify-center rounded-md border border-brand-secondary bg-transparent px-6 text-base font-medium text-brand-secondary shadow transition-colors hover:bg-brand-secondary/10 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Run Agent Again
                </button>
            </div>
        </div>
    );
};

export default ResultsDisplay;
