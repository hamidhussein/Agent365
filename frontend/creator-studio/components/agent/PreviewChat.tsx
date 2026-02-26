import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Trash2 } from 'lucide-react';
import { AgentPayload } from '../../types';
import { API_BASE, authApi } from '../../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
}

interface PreviewChatProps {
  draftAgent: AgentPayload;
  onDebugLog?: (type: any, content: string, metadata?: any) => void;
}

type PreviewMode = 'live' | 'mock';

const buildLocalPreviewResponse = (draftAgent: AgentPayload, userMessage: string) => {
  const caps = [];
  if (draftAgent.enabledCapabilities?.fileHandling) caps.push('RAG / files');
  if (draftAgent.enabledCapabilities?.webBrowsing) caps.push('web search');
  if (draftAgent.enabledCapabilities?.codeExecution) caps.push('code execution');
  if (draftAgent.enabledCapabilities?.apiIntegrations) caps.push('API integrations');

  const capabilitySummary = caps.length ? caps.join(', ') : 'base chat only';
  const instructionPreview = (draftAgent.instruction || '').trim();
  const instructionSnippet = instructionPreview
    ? instructionPreview.slice(0, 220) + (instructionPreview.length > 220 ? '...' : '')
    : 'No system prompt configured yet.';

  return [
    `Draft preview for **${draftAgent.name || 'Untitled Agent'}**`,
    '',
    'This builder preview is running in **local mock mode** because the old public preview streaming endpoint was removed in standalone Creator Studio.',
    '',
    `**Your message:** ${userMessage}`,
    '',
    `**Configured capabilities:** ${capabilitySummary}`,
    '',
    `**Instruction preview:** ${instructionSnippet}`,
    '',
    'To test real model responses, save the agent and open the main chat screen.',
  ].join('\n');
};

export const PreviewChat = ({ draftAgent, onDebugLog }: PreviewChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const setLastModelMessage = (content: string) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === 'model') {
          next[i] = { ...next[i], content };
          break;
        }
      }
      return next;
    });
  };

  const runMockPreview = async (userMessage: string, reason: string) => {
    setPreviewMode('mock');
    if (onDebugLog) {
      onDebugLog('info', `Preview message: "${userMessage}"`, { mode: 'local-mock', reason });
      onDebugLog(
        'warn',
        'Preview fell back to local mock mode because live preview streaming is unavailable.',
        { reason }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    setLastModelMessage(buildLocalPreviewResponse(draftAgent, userMessage));
  };

  const runLivePreview = async (userMessage: string, history: Message[]) => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = authApi.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}/api/chat/preview/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: userMessage,
        draftConfig: draftAgent,
        messages: history
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (response.status === 404) {
      throw new Error('__PREVIEW_ROUTE_NOT_FOUND__');
    }

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || 'Preview request failed');
    }

    setPreviewMode('live');
    onDebugLog?.('info', `Preview message: "${userMessage}"`, { mode: 'live' });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'token') {
            fullText += event.content || '';
          } else if (event.type === 'error') {
            fullText += `${fullText ? '\n' : ''}[Error] ${event.content || 'Preview failed'}`;
          }
        } catch {
          fullText += line;
        }
      }

      setLastModelMessage(fullText);
    }

    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer);
        if (event.type === 'token') {
          fullText += event.content || '';
        } else if (event.type === 'error') {
          fullText += `${fullText ? '\n' : ''}[Error] ${event.content || 'Preview failed'}`;
        }
      } catch {
        fullText += buffer;
      }
      setLastModelMessage(fullText);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const history = messages;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'model', content: '' }]);

    try {
      try {
        await runLivePreview(userMessage, history);
      } catch (error: any) {
        const isNetworkError =
          error instanceof TypeError ||
          /Failed to fetch|NetworkError/i.test(String(error?.message || ''));
        const isMissingPreviewRoute = String(error?.message || '') === '__PREVIEW_ROUTE_NOT_FOUND__';

        if (isNetworkError || isMissingPreviewRoute) {
          const reason = isMissingPreviewRoute ? 'preview_route_404' : 'network_unavailable';
          await runMockPreview(userMessage, reason);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
      setLastModelMessage('Preview failed. Check backend/API key configuration and try again.');
      if (onDebugLog) onDebugLog('error', `Stream failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3 border-b border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${draftAgent.color || 'bg-primary'} flex items-center justify-center text-white shadow-sm shrink-0`}>
            <Bot size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">{draftAgent.name || 'Agent Preview'}</h3>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Draft Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`flex h-1.5 w-1.5 rounded-full ${previewMode === 'live' ? 'bg-emerald-500' : 'bg-amber-500'} ${isLoading ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${previewMode === 'live' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {previewMode === 'live' ? 'Live' : 'Mock'}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Clear conversation"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Empty State ── */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_60%,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 text-muted-foreground shadow-sm mx-auto">
              <Bot size={28} className="text-muted-foreground/60" />
            </div>
            <h4 className="text-foreground font-bold text-base mb-2">Test your agent</h4>
            <p className="text-xs text-muted-foreground max-w-[180px] leading-relaxed">
              Send a message to inspect the current draft configuration before saving.
            </p>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${m.role === 'model'
                ? (draftAgent.color || 'bg-primary') + ' text-white shadow-sm'
                : 'bg-muted text-muted-foreground border border-border'
                }`}>
                {m.role === 'model' ? 'A' : 'U'}
              </div>
              <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'model'
                  ? 'bg-card text-foreground border border-border rounded-tl-none shadow-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/20'
                  }`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => {
                        const href = props.href?.startsWith('/api/files/')
                          ? `${API_BASE}${props.href}`
                          : props.href;
                        return <a {...props} href={href} className="text-blue-500 hover:underline font-semibold" target="_blank" rel="noopener noreferrer" />;
                      },
                      p: ({ node, ...props }) => <p {...props} className="whitespace-pre-wrap" />
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'model' && (
            <div className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${draftAgent.color || 'bg-primary'} text-white`}>
                <Loader2 size={12} className="animate-spin" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Input ── */}
      <div className="p-3 bg-card/60 backdrop-blur-md border-t border-border/60 shrink-0">
        <div className="mb-2.5 px-3 py-1.5 bg-muted/50 border border-border/60 rounded-lg flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${previewMode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <p className="text-[10px] text-muted-foreground leading-tight">
            {previewMode === 'live'
              ? 'Live preview is using the backend stream with your current draft settings (before save).'
              : 'Fallback local mock preview. Start/restart the backend to test real streaming before saving.'}
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Test message..."
            className="w-full bg-background/80 border border-border/60 rounded-xl px-4 py-2.5 pr-11 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 w-7 h-7 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center transition-all disabled:opacity-30 shadow-sm shadow-primary/20 active:scale-95"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
};
