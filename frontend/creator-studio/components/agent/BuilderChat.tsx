import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Check } from 'lucide-react';
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
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [selectedChipMessageIndex, setSelectedChipMessageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Map chip labels to capability keys for auto-toggling
  const CAPABILITY_CHIP_MAP: Record<string, keyof NonNullable<AgentPayload['enabledCapabilities']>> = {
    'web search': 'webBrowsing',
    'code execution': 'codeExecution',
    'file handling': 'fileHandling',
    'api access': 'apiIntegrations',
    'document upload + rag': 'fileHandling',
    'rag': 'fileHandling',
  };

  const applyCapabilityChipSelections = (rawMessage: string) => {
    const normalizedSelections = rawMessage
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    if (normalizedSelections.length === 0) return;

    const nextCaps = {
      codeExecution: false,
      webBrowsing: false,
      apiIntegrations: false,
      fileHandling: false,
      ...(currentState.enabledCapabilities || {}),
    };

    let changed = false;
    for (const selection of normalizedSelections) {
      if (selection === 'all') {
        nextCaps.webBrowsing = true;
        nextCaps.fileHandling = true;
        nextCaps.codeExecution = true;
        nextCaps.apiIntegrations = true;
        changed = true;
        continue;
      }
      const key = CAPABILITY_CHIP_MAP[selection];
      if (key && !nextCaps[key]) {
        nextCaps[key] = true;
        changed = true;
      }
    }

    if (changed) {
      onUpdateState({
        enabledCapabilities: nextCaps,
      });
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage || input).trim();
    if (!userMessage || isLoading) return;

    // Auto-enable capabilities when capability chips are selected/sent.
    if (overrideMessage) {
      applyCapabilityChipSelections(overrideMessage);
    }

    if (!overrideMessage) setInput('');
    setSelectedChips([]);
    setSelectedChipMessageIndex(null);
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

  const handleReset = () => {
    setSelectedChips([]);
    setSelectedChipMessageIndex(null);
    setMessages([{ role: 'model', content: "Reset. Let's start over. What kind of agent are we building?" }]);
  };

  const showSuggestions = messages.length <= 1 && !isLoading;

  // Parse <chips>Option A | Option B | ...</chips> from bot messages
  const parseChips = (text: string): { cleanText: string; chips: string[] } => {
    const chipMatch = text.match(/<chips>(.*?)<\/chips>/s);
    if (!chipMatch) return { cleanText: text, chips: [] };
    const chips = chipMatch[1].split('|').map(c => c.trim()).filter(Boolean);
    const cleanText = text.replace(/<chips>.*?<\/chips>/gs, '').trim();
    return { cleanText, chips };
  };

  const toggleChipSelection = (chip: string, messageIndex: number) => {
    setSelectedChipMessageIndex(prevIdx => (prevIdx === null || prevIdx === messageIndex ? messageIndex : messageIndex));
    setSelectedChips(prev => {
      // If chips belong to a newer message, reset prior selections first.
      const base = selectedChipMessageIndex !== null && selectedChipMessageIndex !== messageIndex ? [] : prev;
      if (base.includes(chip)) {
        return base.filter(c => c !== chip);
      }
      return [...base, chip];
    });
  };

  const handleSendSelectedChips = async () => {
    if (selectedChips.length === 0 || isLoading) return;
    await handleSend(selectedChips.join(' | '));
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'model') {
      setSelectedChips([]);
      setSelectedChipMessageIndex(null);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3 border-b border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">Agent Architect</h3>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Conversational Builder</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-7 px-2.5 text-[10px] bg-background border-border text-muted-foreground hover:text-foreground"
          onClick={handleReset}
        >
          <RefreshCw className="w-3 h-3 mr-1.5" /> Reset
        </Button>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth"
      >
        {/* Suggestion Prompts */}
        {showSuggestions && (
          <div className="space-y-3 mb-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={9} className="text-primary" />
              Try one of these prompts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/30 px-3.5 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all duration-200 text-left leading-snug"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => {
          const isBot = m.role === 'model';
          const { cleanText, chips } = isBot ? parseChips(m.content) : { cleanText: m.content, chips: [] };
          const isLastBot = isBot && i === messages.length - 1;
          const chipsForThisMessageSelected = selectedChipMessageIndex === i;

          return (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'model'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted text-muted-foreground border border-border'
                }`}>
                {m.role === 'model' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className={`flex flex-col max-w-[86%] ${m.role === 'user' ? 'items-end' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'model'
                  ? 'bg-card/95 border border-border text-foreground rounded-tl-none shadow-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/20'
                  }`}>
                  {cleanText}
                </div>
                {/* Quick-reply chips */}
                {isLastBot && chips.length > 0 && !isLoading && (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((chip) => {
                        const isSelected = chipsForThisMessageSelected && selectedChips.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleChipSelection(chip, i)}
                            className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all duration-200 active:scale-95 ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20'
                            }`}
                            title="Click to select (you can choose multiple)"
                          >
                            <span className="inline-flex items-center gap-1">
                              {isSelected && <Check className="w-3 h-3" />}
                              {chip}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        Select one or more chips, then send.
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2.5 text-[10px]"
                        disabled={selectedChips.length === 0}
                        onClick={() => void handleSendSelectedChips()}
                      >
                        Send Selected{selectedChips.length > 0 ? ` (${selectedChips.length})` : ''}
                      </Button>
                      {selectedChips.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => {
                            setSelectedChips([]);
                            setSelectedChipMessageIndex(i);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Loader2 size={13} className="animate-spin" />
            </div>
            <div className="bg-muted/50 border border-border px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-muted-foreground">Architect is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="p-3 border-t border-border/60 bg-card/60 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Describe your agent..."
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
        <p className="text-[9px] text-muted-foreground/50 mt-1.5 text-center tracking-wide">
          The Architect will automatically update the configuration fields based on your chat.
        </p>
      </div>
    </div>
  );
};
