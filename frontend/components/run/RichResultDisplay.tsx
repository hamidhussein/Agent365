import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Clipboard, Check, Code, Terminal, FileText, Mail, AlertTriangle, UserCheck, CheckCircle } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Dialog from '@radix-ui/react-dialog';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RichResultDisplayProps {
    result: any;
    error?: string | null;
    isStreaming: boolean;
    onRunAgain: () => void;
    onRequestReview?: (note: string) => Promise<void>;
    reviewStatus?: 'none' | 'pending' | 'in_progress' | 'completed' | 'rejected';
}

const RequestReviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (note: string) => Promise<void>;
}> = ({ isOpen, onClose, onSubmit }) => {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(note);
        setLoading(false);
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow relative z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-gray-900 border border-gray-700 p-6 shadow-2xl focus:outline-none z-50 data-[state=open]:animate-contentShow">
                    <Dialog.Title className="text-xl font-bold text-white mb-2">
                        Request Expert Review
                    </Dialog.Title>
                    <Dialog.Description className="text-gray-400 text-sm mb-4">
                        Not satisfied with the result? Ask the creator to review and refine it.
                    </Dialog.Description>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
                            placeholder="Describe what needs to be improved..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            required
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Request Review'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

// ... (CopyButton, MarkdownBlock, Card, ResultParser components remain unchanged)

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
        <div className={cn("prose prose-invert max-w-none text-sm leading-relaxed break-words min-w-0", className)}>
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

const RichResultDisplay: React.FC<RichResultDisplayProps & { refinedResult?: any }> = ({ result, refinedResult, error, isStreaming, onRunAgain, onRequestReview, reviewStatus }) => {
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'original' | 'refined'>(refinedResult ? 'refined' : 'original');

    // Auto-switch to refined if it becomes available (e.g. real-time update)
    React.useEffect(() => {
        if (refinedResult) {
            setViewMode('refined');
        }
    }, [refinedResult]);

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

    const displayData = viewMode === 'refined' && refinedResult ? refinedResult : result;

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Execution Result
                    </h2>
                    
                    {refinedResult && (
                        <div className="bg-gray-800 p-1 rounded-lg flex items-center border border-gray-700">
                            <button
                                onClick={() => setViewMode('original')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                    viewMode === 'original' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
                                )}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setViewMode('refined')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                    viewMode === 'refined' ? "bg-purple-600 text-white shadow-sm" : "text-purple-400/80 hover:text-purple-300"
                                )}
                            >
                                <CheckCircle className="w-3 h-3" />
                                Expert Verified
                            </button>
                        </div>
                    )}
                </div>
                
                {reviewStatus === 'pending' && (
                    <span className="text-amber-400 text-sm font-medium px-3 py-1 bg-amber-950/30 border border-amber-900/50 rounded-full flex items-center gap-2">
                        <UserCheck size={14} /> Review Pending
                    </span>
                 )}
            </div>

            <div className={cn(
                "bg-gray-950/30 rounded-xl border p-6 min-h-[300px] shadow-inner backdrop-blur-sm transition-colors duration-300",
                viewMode === 'refined' ? "border-purple-500/30 bg-purple-900/5" : "border-gray-800"
            )}>
                 {viewMode === 'refined' && (
                    <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-start gap-3">
                        <UserCheck className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-purple-200">Expert Verified Output</h4>
                            <p className="text-xs text-purple-300/80 mt-1">This result has been reviewed and refined by the agent creator.</p>
                        </div>
                    </div>
                )}
                <ResultParser data={displayData} />
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
                 {onRequestReview && (!reviewStatus || reviewStatus === 'none' || reviewStatus === 'rejected') && !refinedResult && (
                     <>
                        <button
                            onClick={() => setIsReviewOpen(true)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                            Request Expert Review
                        </button>
                        <RequestReviewModal
                            isOpen={isReviewOpen}
                            onClose={() => setIsReviewOpen(false)}
                            onSubmit={onRequestReview}
                        />
                     </>
                 )}
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
