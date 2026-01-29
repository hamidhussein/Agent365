import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { agentsApi } from '../../api';
import { AgentPayload } from '../../types';

export interface Message {
  role: 'user' | 'model';
  content: string;
}

interface BuilderChatProps {
  currentState: Partial<AgentPayload>;
  onUpdateState: (updates: Partial<AgentPayload>) => void;
  agentId?: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const BuilderChat = ({ currentState, onUpdateState, agentId, messages, setMessages }: BuilderChatProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = [
    'Build an IELTS tutor that evaluates writing and gives band scores.',
    'Create a marketing strategist that writes ad copy and email sequences.',
    'Make a data analyst that summarizes CSVs and outputs insights.',
    'Design a product support agent with FAQ + troubleshooting steps.',
    'Build a research assistant that finds sources and cites them.'
  ];

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

    try {
      const response = await agentsApi.build({
        message: userMessage,
        agent_id: agentId,
        current_state: currentState,
        history: messages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          content: m.content
        }))
      });

      setMessages(prev => [...prev, { role: 'model', content: response.architect_message }]);

      if (response.suggested_changes) {
        onUpdateState(response.suggested_changes);
      }
    } catch (error) {
      console.error('Failed to chat with architect:', error);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-card/90 border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Agent Architect</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Conversational Builder</p>
          </div>
        </div>
        <Button variant="outline" className="h-8 px-3 text-[10px] bg-background" onClick={() => setMessages([{ role: 'model', content: "Reset. Let's start over. What kind of agent are we building?" }])}>
          <RefreshCw className="w-3 h-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gradient-to-b from-muted/20 via-background to-background">
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'model' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-foreground border border-border'
              }`}>
              {m.role === 'model' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'model'
                  ? 'bg-card/90 border border-border text-foreground rounded-tl-none shadow-sm backdrop-blur-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-[0_12px_24px_-16px_rgba(16,185,129,0.45)]'
                }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="bg-muted/60 text-muted-foreground px-4 py-3 rounded-2xl rounded-tl-none text-sm italic border border-border">
              Architect is thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/80">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Describe your agent..."
            className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:grayscale shadow-sm"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          The Architect will automatically update the configuration fields based on your chat.
        </p>
      </div>
    </div>
  );
};
