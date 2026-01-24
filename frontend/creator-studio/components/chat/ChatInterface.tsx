import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, FileText, Copy, RotateCcw, Square, Download, Globe, Code, Zap, Paperclip, Loader2, X } from 'lucide-react';
import { publicApi } from '../../api';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Agent, ChatMessage } from '../../types';
import { MODEL_OPTIONS } from '../../constants';
import { createBotMessage, createUserMessage, updateMessageText } from '../../lib/chatState';
import { API_BASE, authApi } from '../../api';
import { api } from '../../../src/lib/api/client';
import { ReviewStatus } from '../../../src/lib/types';
import ReviewRequestModal from '../../../components/reviews/ReviewRequestModal';

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
  onCreditsRefresh
}: {
  agent: Agent,
  onBack: () => void,
  publicMode?: boolean,
  guestId?: string,
  onCreditsRefresh?: () => void
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
    const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('none');
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleRequestReview = async (note: string) => {
    if (!lastExecutionId) return;

    if (isPublicMode) {
        // Use public endpoint
        const headers = new Headers({ 'Content-Type': 'application/json' });
        
        // Exhaustive token search
        let token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        
        if (!token) {
            try {
                const authStorage = localStorage.getItem('auth-storage');
                if (authStorage) {
                    const parsed = JSON.parse(authStorage);
                    // Some Zustand setups store the token directly in the state
                    token = parsed?.state?.token;
                }
            } catch (e) {}
        }

        if (token) {
            const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers.set('Authorization', bearerToken);
        }

        const res = await fetch(`${API_BASE}/api/public/executions/${lastExecutionId}/review`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ note, guestId })
        });
        if (!res.ok) {
            const text = await res.text();
            let errorMessage = text || 'Failed to request review';
            try {
                const data = JSON.parse(text);
                errorMessage = data.message || data.detail || errorMessage;
            } catch (e) {
                // Not JSON, use raw text or default
            }
            throw new Error(errorMessage);
        }
    } else {
        // Use authenticated endpoint
        await api.executions.requestReview(lastExecutionId, note);
    }
    
    setReviewStatus('pending');
    if (onCreditsRefresh) onCreditsRefresh();
  };

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
        const { text } = await publicApi.extractFileText(file);
        setAttachment({ name: file.name, content: text });
    } catch (err) {
        console.error(err);
        alert('Failed to extract text from file.');
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
    const token = authApi.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const history = messages
      .filter(m => m.id !== 'init') // Skip initial greeting
      .map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        content: m.text
      }));

    const payload = isPublicMode
      ? { guestId, agentId: agent.id, message, inputsContext: context, messages: history }
      : { agentId: agent.id, message, inputsContext: context, messages: history };

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

    const execId = response.headers.get('X-Execution-Id');
    if (execId) {
        setLastExecutionId(execId);
        setReviewStatus('none');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';
      
      for (let line of lines) {
        if (!line.trim()) continue;
        
        // Handle potential case where multiple JSON objects are on one line
        // (sometimes happening with raw streams or windows line endings)
        const parts = line.split('}{').map((p, i, a) => {
            if (a.length === 1) return p;
            if (i === 0) return p + '}';
            if (i === a.length - 1) return '{' + p;
            return '{' + p + '}';
        });

        for (const part of parts) {
            try {
              const event = JSON.parse(part);
              if (event.type === 'token') {
                fullText += event.content;
              } else if (event.type === 'error') {
                fullText += `\n[Error: ${event.content}]`;
              }
            } catch (e) {
              // Not a JSON event, assume raw text
              fullText += part;
            }
        }
      }
      
      setMessages(prev => updateMessageText(prev, botMessageId, fullText));
    }
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
        try {
            const event = JSON.parse(buffer);
            if (event.type === 'token') fullText += event.content;
        } catch (e) {
            fullText += buffer;
        }
        setMessages(prev => updateMessageText(prev, botMessageId, fullText));
    }
  };

  const sendMessage = async (text: string, includeUserMessage: boolean = true) => {
    if ((!text.trim() && !attachment) || isThinking) return;

    let messageText = text;
    if (attachment && includeUserMessage) {
      messageText += `\n\n<details><summary>Attached File: ${attachment.name}</summary>\n\n${attachment.content}\n\n</details>`;
      setAttachment(null);
    }

    const botMsg = createBotMessage('');

    setLastExecutionId(null);
    setReviewStatus('none');

    setMessages(prev => {
      if (!includeUserMessage) return [...prev, botMsg];
      const userMsg = createUserMessage(messageText);
      return [...prev, userMsg, botMsg];
    });
    setInputValue('');
    setIsThinking(true);

    try {
      await streamResponse(messageText, botMsg.id, inputsContext);
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (reviewStatus === 'pending' && lastExecutionId) {
      interval = setInterval(async () => {
        try {
          let data: any;
          if (isPublicMode) {
            const headers = new Headers();
            const token = authApi.getToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            const res = await fetch(`${API_BASE}/api/public/executions/${lastExecutionId}`, { headers });
            if (res.ok) {
              data = await res.json();
            }
          } else {
            const res = await api.executions.get(lastExecutionId);
            data = res.data;
          }

          if (data && data.review_status === 'completed') {
            setReviewStatus('completed');
            // Update the last bot message with the review results
            setMessages(prev => {
              const lastMsg = [...prev].reverse().find(m => m.role === 'model');
              if (lastMsg) {
                const updatedText = `${lastMsg.text}\n\n---\n**Expert Review Note:** ${data.review_response_note || 'The creator has reviewed your request.'}\n\n**Updated Result:**\n${typeof data.outputs === 'object' ? JSON.stringify(data.outputs, null, 2) : data.outputs}`;
                return prev.map(m => m.id === lastMsg.id ? { ...m, text: updatedText } : m);
              }
              return prev;
            });
            clearInterval(interval);
          } else if (data && data.review_status === 'rejected') {
            setReviewStatus('rejected');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [reviewStatus, lastExecutionId, isPublicMode]);

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
    <div className="flex h-screen bg-[#0f172a] relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,#0f172a_100%)]" />
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} 
      />

      {/* Sidebar Info */}
      <div className="w-80 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col hidden lg:flex relative z-10">
        <div className="p-6 border-b border-white/5">
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
          
          {(agent.enabledCapabilities?.codeExecution || agent.enabledCapabilities?.webBrowsing || agent.enabledCapabilities?.apiIntegrations || agent.enabledCapabilities?.fileHandling) && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Capabilities</h3>
              <ul className="space-y-2">
                {agent.enabledCapabilities.webBrowsing && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Globe size={14} className="text-teal-400" />
                    <span>Web Browsing</span>
                  </li>
                )}
                {agent.enabledCapabilities.codeExecution && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Code size={14} className="text-purple-400" />
                    <span>Code Execution</span>
                  </li>
                )}
                {agent.enabledCapabilities.apiIntegrations && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Zap size={14} className="text-amber-400" />
                    <span>API Actions</span>
                  </li>
                )}
                {agent.enabledCapabilities.fileHandling && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <FileText size={14} className="text-orange-400" />
                    <span>File Handling</span>
                  </li>
                )}
              </ul>
            </div>
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
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative z-10">
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

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[2rem] px-6 py-4 shadow-xl relative break-words transition-all duration-300 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-none ring-1 ring-white/20'
                          : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-200 rounded-bl-none hover:bg-white/10'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        <div className="prose prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-white/5">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const code = String(children).replace(/\n$/, '');
                                if (!match) {
                                  return <code className="bg-white/10 px-1 py-0.5 rounded text-blue-300 font-mono text-[0.9em]" {...props}>{code}</code>;
                                }
                                return (
                                  <div className="relative group/code my-4">
                                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-slate-800 border border-white/10 rounded text-[10px] text-slate-400 font-mono z-10">
                                      {match[1].toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(code)}
                                      className="absolute right-3 top-3 p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all border border-white/5 backdrop-blur-sm"
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <pre className="m-0 bg-slate-950/80 border border-white/5 rounded-2xl p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                      <code className={`${className} text-sm leading-relaxed`}>{code}</code>
                                    </pre>
                                  </div>
                                );
                              }
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-[15px] leading-relaxed font-medium">{msg.text}</div>
                      )}
                      
                      <button
                        onClick={() => copyToClipboard(msg.text)}
                        className="absolute -top-1 -right-1 p-2 text-slate-400 hover:text-white bg-slate-800 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
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

            <div className="p-6 md:p-8 pt-0 relative z-10">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl relative group/input">
                  {/* Focus Glow */}
                  <div className="absolute inset-0 bg-blue-500/5 rounded-[2.5rem] opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none" />
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
                    {agent.allow_reviews && lastExecutionId && !isThinking && (
                        <Button
                        variant="outline"
                        className={`text-xs ${reviewStatus === 'pending' ? 'text-amber-400 border-amber-400/50' : ''}`}
                        onClick={() => setIsReviewModalOpen(true)}
                        disabled={reviewStatus !== 'none' && reviewStatus !== 'rejected'}
                        title={reviewStatus === 'pending' ? "Review Pending" : "Request Expert Review"}
                        >
                        {reviewStatus === 'pending' ? 'Review Pending' : 'Request Review'}
                        </Button>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{agentModelOption?.label || 'AI Model'}</div>
                </div>

                {attachment && (
                  <div className="mb-2 mx-1 flex items-center justify-between p-2 bg-slate-800 border border-slate-700 rounded-lg animate-in slide-in-from-bottom-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="bg-blue-500/20 p-1.5 rounded text-blue-400">
                        <Paperclip size={14} />
                      </div>
                      <span className="text-xs text-slate-200 truncate font-medium max-w-[200px]">{attachment.name}</span>
                      <span className="text-xs text-slate-500">(Context)</span>
                    </div>
                    <button 
                      onClick={() => setAttachment(null)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="relative flex items-end gap-2 px-2">
                  {agent.enabledCapabilities?.fileHandling && (
                    <>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                        accept=".pdf,.txt,.md,.docx,.html,.csv"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isThinking || !!attachment}
                        variant="ghost"
                        className="mb-0.5 rounded-lg w-10 h-10 p-0 flex items-center justify-center shrink-0 text-slate-400 hover:text-white hover:bg-slate-700"
                        title="Attach file"
                      >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                      </Button>
                    </>
                  )}
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
                    className="mb-0.5 rounded-[1.25rem] w-12 h-12 p-0 flex items-center justify-center shrink-0 shadow-lg"
                    aria-label="Send message"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-center mt-3 scale-95 opacity-60">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">AI can make mistakes. Please check important info.</p>
            </div>
          </div>
        </>
        )}
      </div>
      <ReviewRequestModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleRequestReview}
        agentName={agent.name}
        reviewCost={agent.review_cost}
      />
    </div>
  );
};
