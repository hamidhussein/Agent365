import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Info } from 'lucide-react';
import { AgentPayload } from '../../types';
import { API_BASE } from '../../api';
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

export const PreviewChat = ({ draftAgent, onDebugLog }: PreviewChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Initial placeholder for assistant message
    setMessages(prev => [...prev, { role: 'model', content: '' }]);

    const payload = {
       guestId: 'preview-session',
       agentId: 'preview',
       message: userMessage,
       messages: messages.map(m => ({ role: m.role, content: m.content })),
       draftConfig: draftAgent
    };

    try {
      const response = await fetch(`${API_BASE}/api/public/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
         throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (onDebugLog) onDebugLog('info', `Sent message: "${userMessage}"`);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const event = JSON.parse(line);
                
                if (event.type === 'token') {
                     assistantMessage += event.content;
                     setMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1].content = assistantMessage;
                        return newMsgs;
                     });
                } 
                else if (event.type === 'thought') {
                    if (onDebugLog) onDebugLog('thought', event.content);
                }
                else if (event.type === 'tool_call') {
                    if (onDebugLog) onDebugLog('tool_call', `Calling ${event.name}`, event.args);
                }
                else if (event.type === 'tool_result') {
                    if (onDebugLog) onDebugLog('tool_result', `Result from ${event.name}`, { result: event.result });
                }
                else if (event.type === 'error') {
                     if (onDebugLog) onDebugLog('error', event.content);
                }
            } catch (e) {
                console.error("Failed to parse stream chunk", line);
            }
        }
      }

    } catch (error) {
      console.error('Preview error:', error);
      setMessages(prev => {
         const newMsgs = [...prev];
         newMsgs[newMsgs.length - 1].content += "\n[Error: Failed to connect to preview stream]";
         return newMsgs;
      });
      if (onDebugLog) onDebugLog('error', `Stream failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${draftAgent.color || 'bg-slate-600'} flex items-center justify-center text-white`}>
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{draftAgent.name || 'Agent Preview'}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Live Testing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
        </div>
      </div>

      {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-400">
                  <Bot size={32} />
              </div>
              <h4 className="text-white font-bold mb-2">Test your agent</h4>
              <p className="text-sm text-slate-500 max-w-[200px]">Send a message to see how your agent responds with the current configuration.</p>
          </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'model' ? (draftAgent.color || 'bg-slate-600') : 'bg-slate-800'
            } text-white text-[10px] font-bold`}>
              {m.role === 'model' ? 'A' : 'U'}
            </div>
            <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'model' 
                  ? 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none' 
                  : 'bg-slate-800 text-white rounded-tr-none'
              }`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({node, ...props}) => {
                      const href = props.href?.startsWith('/api/files/') 
                        ? `${API_BASE}${props.href}` 
                        : props.href;
                      return <a {...props} href={href} className="text-blue-400 hover:underline font-bold" target="_blank" rel="noopener noreferrer" />;
                    },
                    p: ({node, ...props}) => <p {...props} className="whitespace-pre-wrap" />
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'model' && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <Loader2 size={14} className="animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
         <div className="mb-3 px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-blue-400/80 leading-tight">
                Preview uses "Auto" model. Interaction here doesn't consume permanent agent tokens.
            </p>
         </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Test message..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
