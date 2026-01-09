import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, FileText, Copy, RotateCcw, Square, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Agent, ChatMessage } from '../../types';
import { MODEL_OPTIONS } from '../../constants';
import { createBotMessage, createUserMessage, updateMessageText } from '../../lib/chatState';
import { API_BASE, authApi } from '../../api';

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
};

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const ChatInterface = ({
  agent,
  onBack,
  publicMode = false,
  guestId,
  credits,
  onBuyCredits,
  onCreditsRefresh
}: {
  agent: Agent,
  onBack: () => void,
  publicMode?: boolean,
  guestId?: string,
  credits?: number,
  onBuyCredits?: (amount: number) => void,
  onCreditsRefresh?: () => void
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string | File | null>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [inputsContext, setInputsContext] = useState<string | null>(null);
  const [isCollectingInputs, setIsCollectingInputs] = useState(agent.inputs.length > 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const agentModelOption = MODEL_OPTIONS.find(m => m.id === agent.model);
    const isPublicMode = Boolean(publicMode && guestId);

  useEffect(() => {
    abortControllerRef.current?.abort();
    setIsThinking(false);
    setInputValue('');
    setLastUserMessage(null);
    setInputsContext(null);
    setInputErrors({});
    setIsCollectingInputs(agent.inputs.length > 0);

    const initialValues: Record<string, string | File | null> = {};
    agent.inputs.forEach((input) => {
      initialValues[input.id] = input.type === 'file' ? null : '';
    });
    setInputValues(initialValues);

    setMessages([
      {
        id: 'init',
        role: 'model',
        text: `Hello! I am ${agent.name}. ${agent.description ? agent.description.trim() : ''} How can I assist you today?`.replace(/\s+/g, ' ').trim(),
        timestamp: new Date()
      }
    ]);
  }, [agent, agentModelOption]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const updateInputValue = (id: string, value: string | File | null) => {
    setInputValues(prev => ({ ...prev, [id]: value }));
    if (inputErrors[id]) {
      setInputErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const buildInputsContext = () => {
    const lines = agent.inputs
      .map((input) => {
        const value = inputValues[input.id];
        if (input.type === 'file') {
          if (value instanceof File) {
            return `- ${input.label}: ${value.name} (${formatBytes(value.size)})`;
          }
          return null;
        }
        const textValue = typeof value === 'string' ? value.trim() : '';
        if (!textValue) return null;
        return `- ${input.label}: ${textValue}`;
      })
      .filter((line): line is string => Boolean(line));

    if (lines.length === 0) return null;
    return `USER PROVIDED THE FOLLOWING REQUIRED INPUTS:\n${lines.join('\n')}`;
  };

  const handleStartConversation = () => {
    const errors: Record<string, string> = {};
    agent.inputs.forEach((input) => {
      if (!input.required) return;
      const value = inputValues[input.id];
      if (input.type === 'file') {
        if (!(value instanceof File)) {
          errors[input.id] = 'Required.';
        }
        return;
      }
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors[input.id] = 'Required.';
      }
    });

    setInputErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setInputsContext(buildInputsContext());
    setIsCollectingInputs(false);
  };

  const streamResponse = async (message: string, botMessageId: string, context: string | null) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (!isPublicMode) {
      const token = authApi.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const payload = isPublicMode
      ? { guestId, agentId: agent.id, message, inputsContext: context }
      : { agentId: agent.id, message, inputsContext: context };

    const endpoint = isPublicMode ? '/api/public/chat/stream' : '/api/chat/stream';
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      if (response.status === 402) {
        const error = new Error(text || 'Not enough credits');
        (error as any).code = 'INSUFFICIENT_CREDITS';
        throw error;
      }
      throw new Error(text || 'Request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      setMessages(prev => updateMessageText(prev, botMessageId, fullText));
    }
  };

  const sendMessage = async (text: string, includeUserMessage: boolean = true) => {
    if (!text.trim() || isThinking) return;

    const botMsg = createBotMessage('');

    setMessages(prev => {
      if (!includeUserMessage) return [...prev, botMsg];
      const userMsg = createUserMessage(text);
      return [...prev, userMsg, botMsg];
    });
    setInputValue('');
    setIsThinking(true);

    try {
      await streamResponse(text, botMsg.id, inputsContext);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (error?.code === 'INSUFFICIENT_CREDITS') {
          setMessages(prev => updateMessageText(prev, botMsg.id, 'Not enough credits to continue. Please buy more to keep chatting.'));
        } else {
          setMessages(prev => updateMessageText(prev, botMsg.id, 'I encountered an error processing your request. Please try again.'));
        }
      }
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
      if (isPublicMode && onCreditsRefresh) {
        onCreditsRefresh();
      }
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const nextMessage = inputValue.trim();
    setLastUserMessage(nextMessage);
    await sendMessage(nextMessage);
  };

  const handleRegenerate = async () => {
    if (!lastUserMessage) return;
    await sendMessage(lastUserMessage, false);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsThinking(false);
  };

  const exportConversation = () => {
    const payload = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `${agent.name.replace(/\s+/g, '_').toLowerCase()}_chat.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar Info */}
      <div className="w-80 bg-slate-800/30 border-r border-slate-700 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl ${agent.color} flex items-center justify-center text-white shadow-lg`}>
              {agentModelOption?.icon || <Bot size={24} />}
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">{agent.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                {agentModelOption?.label || 'AI Model'}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {agent.description}
          </p>
          <Button variant="outline" className="mt-4 text-xs" onClick={exportConversation}>
            <Download size={14} /> Export Chat
          </Button>
          {isPublicMode && typeof credits === 'number' && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Credits</span>
                <span className="text-slate-200 font-semibold">{credits}</span>
              </div>
              <Button
                variant="outline"
                className="mt-3 text-xs w-full"
                onClick={() => onBuyCredits?.(10)}
              >
                Buy 10 credits
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Knowledge Files</h3>
          {agent.files.length === 0 ? (
            <p className="text-sm text-slate-600 italic">No files attached.</p>
          ) : (
            <ul className="space-y-2">
              {agent.files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <FileText size={14} className="text-blue-400" />
                  <span className="truncate">{f.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {isCollectingInputs ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="lg:hidden mb-4">
              <Button variant="outline" className="text-xs w-full mb-2" onClick={exportConversation}>
                <Download size={14} /> Export Chat History
              </Button>
            </div>

            <div className="max-w-2xl mx-auto bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Before we start</h2>
                  <p className="text-sm text-slate-400">Provide the required inputs for {agent.name}.</p>
                </div>
                <span className="text-xs text-slate-500">{agentModelOption?.label || 'AI Model'}</span>
              </div>

              <div className="space-y-4">
                {agent.inputs.map((input) => {
                  const label = input.required ? `${input.label} *` : input.label;
                  const error = inputErrors[input.id];
                  const value = inputValues[input.id];

                  if (input.type === 'textarea') {
                    return (
                      <div key={input.id}>
                        <TextArea
                          label={label}
                          rows={4}
                          placeholder={input.description || ''}
                          value={typeof value === 'string' ? value : ''}
                          onChange={(e: any) => updateInputValue(input.id, e.target.value)}
                        />
                        {input.description && (
                          <p className="text-xs text-slate-500 -mt-2">{input.description}</p>
                        )}
                        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                      </div>
                    );
                  }

                  if (input.type === 'file') {
                    return (
                      <div key={input.id}>
                        <label className="text-sm font-medium text-slate-300 block mb-2">{label}</label>
                        <input
                          type="file"
                          onChange={(e) => updateInputValue(input.id, e.target.files?.[0] || null)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                        />
                        {value instanceof File ? (
                          <p className="text-xs text-slate-400 mt-2">Selected: {value.name} ({formatBytes(value.size)})</p>
                        ) : (
                          <p className="text-xs text-slate-600 mt-2">No file selected.</p>
                        )}
                        {input.description && (
                          <p className="text-xs text-slate-500 mt-2">{input.description}</p>
                        )}
                        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                      </div>
                    );
                  }

                  return (
                    <div key={input.id}>
                      <Input
                        label={label}
                        placeholder={input.description || ''}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e: any) => updateInputValue(input.id, e.target.value)}
                      />
                      {input.description && (
                        <p className="text-xs text-slate-500 -mt-2">{input.description}</p>
                      )}
                      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 mt-6">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={handleStartConversation}>Start Conversation</Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {/* Mobile Back Button */}
              {/* Mobile Info Button instead of Back */}
              <div className="lg:hidden mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
                 <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-white`}>
                      {agentModelOption?.icon || <Bot size={16} />}
                    </div>
                    <span className="font-bold text-white text-sm">{agent.name}</span>
                 </div>
                 <Button variant="outline" className="text-xs px-2 h-8" onClick={exportConversation}>
                   <Download size={14} /> Export
                 </Button>
              </div>

              {messages.map((msg) => (
                <div key={msg.id} className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm relative ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const code = String(children).replace(/\n$/, '');
                            if (!match) {
                              return <code className="bg-slate-900/80 px-1 py-0.5 rounded text-slate-100" {...props}>{code}</code>;
                            }
                            return (
                              <div className="relative group">
                                <button
                                  onClick={() => copyToClipboard(code)}
                                  className="absolute right-2 top-2 text-xs text-slate-400 hover:text-white bg-slate-900/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                                >
                                  Copy
                                </button>
                                <pre className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 overflow-x-auto">
                                  <code className={className}>{code}</code>
                                </pre>
                              </div>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    )}
                    <button
                      onClick={() => copyToClipboard(msg.text)}
                      className="absolute -top-3 right-2 text-xs text-slate-400 hover:text-white bg-slate-900/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-5 py-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
              <div className="max-w-4xl mx-auto relative flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="text-xs"
                      disabled={!lastUserMessage || isThinking}
                      onClick={handleRegenerate}
                    >
                      <RotateCcw size={14} /> Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs"
                      disabled={!isThinking}
                      onClick={handleStop}
                    >
                      <Square size={14} /> Stop
                    </Button>
                  </div>
                  <div className="text-xs text-slate-500">{agentModelOption?.label || 'AI Model'}</div>
                </div>

                <div className="relative flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${agent.name}...`}
                    className="w-full bg-transparent border-none text-white px-3 py-2 outline-none resize-none max-h-32 placeholder-slate-500"
                    rows={1}
                    style={{ minHeight: '44px' }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isThinking}
                    className="mb-0.5 rounded-lg w-10 h-10 p-0 flex items-center justify-center shrink-0"
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs text-slate-600">AI can make mistakes. Please check important info.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
