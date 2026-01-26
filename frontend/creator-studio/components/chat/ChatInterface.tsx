import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, FileText, Copy, RotateCcw, Square, Download, Globe, Code, Zap, Paperclip, Loader2, X, ChevronDown } from 'lucide-react';
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

// Parse streaming token format into clean text
const smartUnwrap = (data: any): string => {
  if (!data) return '';
  try {
    // Handle string data
    if (typeof data === 'string') {
      // First, try to parse newline-separated JSON objects
      const lines = data.split('\n').filter(line => line.trim());
      const tokens: string[] = [];
      let allParsed = true;
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.type === 'token' && parsed.content !== undefined) {
            tokens.push(parsed.content);
          } else {
            allParsed = false;
            break;
          }
        } catch {
          allParsed = false;
          break;
        }
      }
      
      if (allParsed && tokens.length > 0) {
        return tokens.join('');
      }
      
      // Try concatenated JSON objects: {...}{...}
      if (/}\s*{/.test(data)) {
        const fixed = '[' + data.replace(/}\s*{/g, '},{') + ']';
        const parsed = JSON.parse(fixed);
        return parsed.filter((t: any) => t.type === 'token' && t.content).map((t: any) => t.content).join('');
      }
      
      // Return as-is if no JSON pattern detected
      return data;
    }
    
    // Handle array of token objects
    if (Array.isArray(data)) {
      return data.filter((t: any) => t && t.type === 'token' && t.content).map((t: any) => t.content).join('');
    }
    
    // Handle object with response/result/text/content property
    if (typeof data === 'object') {
      const textSeed = data.response || data.result || data.text || data.content;
      if (textSeed) return typeof textSeed === 'string' ? smartUnwrap(textSeed) : JSON.stringify(textSeed);
      return JSON.stringify(data, null, 2);
    }
    
    return String(data);
  } catch (e) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
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
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleRequestReview = async (note: string, priority?: 'standard' | 'high') => {
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
            body: JSON.stringify({ note, guestId, priority })
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
        await api.executions.requestReview(lastExecutionId, note, priority);
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

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserHasScrolledUp(!isAtBottom);
  };

  const scrollToBottom = (force = false) => {
    if (force || !userHasScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: force ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    setUserHasScrolledUp(false);

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
            const url = new URL(`${API_BASE}/api/public/executions/${lastExecutionId}`);
            if (guestId) {
              url.searchParams.set('guestId', guestId);
            }
            const res = await fetch(url.toString(), { headers });
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
                // Prefer refined_outputs if available, otherwise use outputs
                const outputToShow = data.refined_outputs || data.outputs;
                const parsedOutput = smartUnwrap(outputToShow);
                const updatedText = `${lastMsg.text}\n\n---\n**Expert Review Note:** ${data.review_response_note || 'The creator has reviewed your request.'}\n\n**Updated Result:**\n${parsedOutput}`;
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
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10"
            >
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
                {messages.map((msg, index) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.3, 
                      ease: [0.4, 0, 0.2, 1],
                      delay: index * 0.05 
                    }}
                    className={`group flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar */}
                    {msg.role === 'model' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-8 h-8 rounded-xl ${agent.color} flex items-center justify-center text-white shadow-lg ring-2 ring-white/10`}>
                          {agentModelOption?.icon || <Bot size={16} />}
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] md:max-w-[65%] rounded-2xl px-5 py-3.5 shadow-xl relative break-words transition-all duration-300 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-br-md ring-2 ring-blue-400/20 shadow-blue-500/20'
                          : 'bg-gradient-to-br from-slate-800/90 to-slate-800/70 backdrop-blur-xl border border-white/10 text-slate-100 rounded-bl-md hover:border-white/20 shadow-slate-900/50'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        <div className="prose prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-white/5 prose-code:text-blue-300">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const code = String(children).replace(/\n$/, '');
                                if (!match) {
                                  return <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[0.9em]" {...props}>{code}</code>;
                                }
                                return (
                                  <div className="relative group/code my-4 not-prose">
                                    <div className="absolute -top-3 left-4 px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-slate-300 font-mono z-10 shadow-lg">
                                      {match[1].toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(code)}
                                      className="absolute right-3 top-3 p-2.5 text-slate-400 hover:text-white bg-slate-900/80 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all border border-white/10 backdrop-blur-sm hover:bg-slate-800"
                                      title="Copy code"
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <pre className="m-0 bg-slate-950/90 border border-white/10 rounded-2xl p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                        className="absolute -top-2 -right-2 p-2 text-slate-400 hover:text-white bg-slate-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
                        title="Copy message"
                      >
                        <Copy size={12} />
                      </button>

                      {/* Timestamp on hover */}
                      <div className="absolute -bottom-5 left-0 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg ring-2 ring-blue-400/20 font-semibold text-sm">
                          U
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isThinking && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  {/* Bot Avatar */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-8 h-8 rounded-xl ${agent.color} flex items-center justify-center text-white shadow-lg ring-2 ring-white/10`}>
                      {agentModelOption?.icon || <Bot size={16} />}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/70 backdrop-blur-xl border border-white/10 rounded-2xl rounded-bl-md px-6 py-4 shadow-xl">
                    <div className="flex gap-2 items-center">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5]
                        }} 
                        transition={{ repeat: Infinity, duration: 1.2, delay: 0, ease: "easeInOut" }}
                        className="w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" 
                      />
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5]
                        }} 
                        transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, ease: "easeInOut" }}
                        className="w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" 
                      />
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5]
                        }} 
                        transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                        className="w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" 
                      />
                      <span className="text-xs text-slate-400 ml-2">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {userHasScrolledUp && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-32 right-8 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl z-20 border border-white/20 transition-colors"
                >
                  <ChevronDown size={20} />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="p-4 md:p-6 pt-2 relative z-10">
              <div className="max-w-4xl mx-auto">
                {/* Action Bar */}
                <div className="flex items-center justify-between gap-2 mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={!lastUserMessage || isThinking}
                      onClick={handleRegenerate}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5 hover:border-white/20 backdrop-blur-sm"
                      title="Regenerate last response"
                    >
                      <RotateCcw size={14} /> 
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    {isThinking && (
                      <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all border border-red-400/20 hover:border-red-400/40 backdrop-blur-sm"
                        title="Stop generation"
                      >
                        <Square size={14} className="fill-current" /> 
                        <span className="hidden sm:inline">Stop</span>
                      </button>
                    )}
                    {agent.allow_reviews && lastExecutionId && !isThinking && (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        disabled={reviewStatus !== 'none' && reviewStatus !== 'rejected'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border backdrop-blur-sm ${
                          reviewStatus === 'pending' 
                            ? 'text-amber-400 border-amber-400/40 bg-amber-400/10 cursor-not-allowed' 
                            : 'text-slate-300 border-white/5 hover:text-white hover:bg-white/10 hover:border-white/20'
                        }`}
                        title={reviewStatus === 'pending' ? 'Review request pending' : 'Request expert review'}
                      >
                        {reviewStatus === 'pending' ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span className="hidden sm:inline">Review Pending</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Request Review</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2 py-1 bg-slate-800/50 rounded-lg border border-white/5">
                      {agentModelOption?.label || 'AI Model'}
                    </div>
                  </div>
                </div>

                {/* Input Container */}
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-2xl border-2 border-white/10 rounded-3xl p-1.5 shadow-2xl relative group/input hover:border-white/20 transition-all">
                  {/* Focus Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none blur-xl" />
                  
                  {attachment && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-2 mx-2 flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 ring-2 ring-blue-400/20">
                          <Paperclip size={16} />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm text-slate-200 truncate font-medium max-w-[250px]">{attachment.name}</span>
                          <span className="text-xs text-slate-500">Attached as context</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAttachment(null)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                        title="Remove attachment"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
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
                          className="mb-1 rounded-xl w-11 h-11 p-0 flex items-center justify-center shrink-0 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-30"
                          title="Attach file"
                        >
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                        </Button>
                      </>
                    )}
                    <textarea
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        // Auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={`Ask ${agent.name} anything...`}
                      className="w-full bg-transparent border-none text-white px-4 py-3 outline-none resize-none max-h-[150px] placeholder-slate-500 text-[15px] leading-relaxed"
                      rows={1}
                      style={{ minHeight: '48px' }}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isThinking}
                      className={`mb-1 rounded-2xl w-12 h-12 p-0 flex items-center justify-center shrink-0 shadow-2xl transition-all ${
                        inputValue.trim() && !isThinking
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 scale-100 hover:scale-105'
                          : 'bg-slate-700 opacity-50 cursor-not-allowed'
                      }`}
                      aria-label="Send message"
                    >
                      {isThinking ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-[11px] text-slate-500 font-medium">AI can make mistakes. Please verify important information.</p>
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
