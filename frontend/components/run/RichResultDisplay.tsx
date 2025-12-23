import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Clipboard, Check, Code, Terminal, FileText, Mail, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RichResultDisplayProps {
    result: any; // Can be string or object
    error?: string | null;
    isStreaming: boolean;
    onRunAgain: () => void;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Copy to clipboard"
        >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Clipboard className="w-4 h-4" />}
        </button>
    );
};

const MarkdownBlock: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    return (
        <div className={cn("prose prose-invert max-w-none text-sm leading-relaxed", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code: ({ node, inline, className, children, ...props }: any) => {
                        return !inline ? (
                            <div className="relative group my-4">
                                <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto border border-gray-800 text-gray-200">
                                    <code {...props} className={className}>
                                        {children}
                                    </code>
                                </pre>
                                <CopyButton text={String(children).replace(/\n$/, '')} />
                            </div>
                        ) : (
                            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-brand-primary font-mono text-xs" {...props}>
                                {children}
                            </code>
                        );
                    },
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-brand-primary mt-4 mb-2">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-brand-primary pl-4 italic text-gray-400 my-4">{children}</blockquote>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-gray-300">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-gray-300">{children}</ol>,
                    p: ({ children }) => <p className="mb-3 text-gray-300 last:mb-0">{children}</p>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; copyContent?: string }> = ({ title, icon, children, copyContent }) => (
    <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden mb-6 last:mb-0 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="bg-gray-800/60 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-semibold text-gray-200 text-sm uppercase tracking-wide">{title}</h3>
            </div>
            {copyContent && <div className="relative w-6 h-6"><CopyButton text={copyContent} /></div>}
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

const ResultParser: React.FC<{ data: any }> = ({ data }) => {
    // 1. If string, just render markdown
    if (typeof data === 'string') {
        try {
            // Sometimes it's a JSON string
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object') return <ResultParser data={parsed} />;
        } catch { }
        return <MarkdownBlock content={data} />;
    }

    // 2. If valid object
    if (typeof data === 'object' && data !== null) {
        // Special Case: Cold Email
        if ((data.subject || data.subject_line) && (data.body || data.email_body)) {
            const subject = data.subject || data.subject_line;
            const body = data.body || data.email_body;

            return (
                <div className="space-y-4">
                    <Card title="Subject Line" icon={<Mail className="w-4 h-4 text-blue-400" />} copyContent={subject}>
                        <p className="text-lg font-medium text-white">{subject}</p>
                    </Card>
                    <Card title="Email Body" icon={<FileText className="w-4 h-4 text-blue-400" />} copyContent={body}>
                        <div className="whitespace-pre-wrap text-gray-300 font-sans">{body}</div>
                    </Card>
                </div>
            )
        }

        // Special Case: Code/SQL
        if (data.sql_query || data.python_code || data.code || data.regex_pattern) {
            const code = data.sql_query || data.python_code || data.code || data.regex_pattern;
            const explanation = data.explanation || data.description;

            return (
                <div className="space-y-6">
                    <Card title="Generated Code" icon={<Code className="w-4 h-4 text-green-400" />} copyContent={code}>
                        <MarkdownBlock content={`\`\`\`${data.sql_query ? 'sql' : 'python'}\n${code}\n\`\`\``} />
                    </Card>
                    {explanation && (
                        <Card title="Explanation" icon={<Terminal className="w-4 h-4 text-yellow-400" />}>
                            <MarkdownBlock content={explanation} />
                        </Card>
                    )}
                </div>
            )
        }

        // Generic Key-Value
        return (
            <div className="space-y-6">
                {Object.entries(data).map(([key, value]) => {
                    if (!value) return null;

                    return (
                        <Card
                            key={key}
                            title={key.replace(/_/g, ' ')}
                            icon={<Terminal className="w-3 h-3 text-gray-500" />}
                            copyContent={typeof value === 'string' ? value : JSON.stringify(value)}
                        >
                            {typeof value === 'string' ? (
                                <MarkdownBlock content={value} />
                            ) : (
                                <pre className="text-xs text-gray-400 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                            )}
                        </Card>
                    );
                })}
            </div>
        );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

const RichResultDisplay: React.FC<RichResultDisplayProps> = ({ result, error, isStreaming, onRunAgain }) => {
    if (error) {
        return (
            <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-red-500">Execution Failed</h2>
                </div>

                <div className="bg-red-950/20 rounded-xl border border-red-800/50 p-6 shadow-inner backdrop-blur-sm flex flex-col items-center justify-center text-center min-h-[300px]">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h3>
                    <p className="text-gray-300 max-w-md">{error}</p>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={onRunAgain} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!result && isStreaming) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-pulse">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p>Generating...</p>
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    Execution Result
                </h2>
                {/* Global Run Again if needed at top, but usually at bottom is fine */}
            </div>

            <div className="bg-gray-950/30 rounded-xl border border-gray-800 p-6 min-h-[300px] shadow-inner backdrop-blur-sm">
                <ResultParser data={result} />
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={onRunAgain}
                    disabled={isStreaming}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                    Run Agent Again
                </button>
            </div>
        </div>
    );
};

export default RichResultDisplay;
