import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import axios from 'axios';

interface SharedAgentChatPageProps {
  shareToken: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachmentName?: string;
}

interface AgentCapabilities {
  web_search: boolean;
  file_handling: boolean;
  code_execution: boolean;
  rag: boolean;
}

interface AgentInfo {
  agent_id: string;
  agent_name: string;
  agent_description: string;
  welcome_message: string | null;
  starter_questions: string[];
  link_type: string;
  share_token: string;
  capabilities: AgentCapabilities;
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-white/10 text-indigo-300 rounded px-1 py-0.5 text-xs font-mono">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic text-white/80">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      const level = (line.match(/^(#+)/) || [''])[0].length;
      const content = line.replace(/^#+\s/, '');
      const Tag = `h${Math.min(level, 3)}` as keyof JSX.IntrinsicElements;
      const sizeClass = level === 1 ? 'text-lg font-bold' : level === 2 ? 'text-base font-semibold' : 'text-sm font-semibold';
      elements.push(<Tag key={i} className={`${sizeClass} text-white mt-3 mb-1`}>{inlineFormat(content)}</Tag>);
    } else if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s/, '')); i++; }
      elements.push(
        <ul key={`ul-${i}`} className="list-none space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-white/90">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      elements.push(
        <ol key={`ol-${i}`} className="list-none space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-white/90">
              <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/40 text-indigo-300 text-xs flex items-center justify-center font-semibold mt-0.5">{j + 1}</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (/^\|/.test(line.trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { tableLines.push(lines[i]); i++; }
      const parseRow = (row: string) => row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isSep = (r: string) => /^[\|\s\-:]+$/.test(r);
      const headerRow = parseRow(tableLines[0] || '');
      const bodyRows = tableLines.slice(isSep(tableLines[1] || '') ? 2 : 1).map(parseRow);
      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm border-collapse">
            {headerRow.length > 0 && (
              <thead><tr className="bg-white/10">
                {headerRow.map((cell, j) => (
                  <th key={j} className="px-4 py-2 text-left text-xs font-semibold text-indigo-300 border-b border-white/10 whitespace-nowrap">{inlineFormat(cell)}</th>
                ))}
              </tr></thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white/5' : ''}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-white/80 border-b border-white/5 align-top">{inlineFormat(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      elements.push(
        <pre key={`code-${i}`} className="my-3 bg-black/30 border border-white/10 rounded-xl p-4 overflow-x-auto">
          <code className="text-sm text-indigo-200 font-mono whitespace-pre">{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-white/90 leading-relaxed">{inlineFormat(line)}</p>);
    }
    i++;
  }
  return <>{elements}</>;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const AgentIcon: React.FC<{ name: string }> = ({ name }) => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-indigo-500/30">
    {name?.charAt(0)?.toUpperCase() || 'A'}
  </div>
);

const UserIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white shrink-0 shadow-md">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  </div>
);

const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-3">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
      <span className="text-white text-sm">✦</span>
    </div>
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4 flex gap-1.5 items-center">
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const SharedAgentChatPage: React.FC<SharedAgentChatPageProps> = ({ shareToken }) => {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

  useEffect(() => { loadAgentInfo(); }, [shareToken]);
  useEffect(() => { scrollToBottom(); }, [messages, sending]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadAgentInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/share/${shareToken}/info`, { headers: getAuthHeaders() });
      setAgentInfo(response.data);
      if (response.data.welcome_message) {
        setMessages([{ role: 'assistant', content: response.data.welcome_message }]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) setError('Authentication required. Please log in to access this agent.');
      else if (err.response?.status === 403) setError(err.response.data.detail || "You don't have access to this agent.");
      else if (err.response?.status === 404) setError('This share link is invalid or has been removed.');
      else setError('Failed to load agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('auth_token_session');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() && !attachedFile && !attachedImage) return;
    if (sending) return;

    const currentFile = attachedFile || attachedImage;
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      attachmentName: currentFile?.name
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFile(null);
    setAttachedImage(null);
    setImagePreview(null);
    setSending(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const formData = new FormData();
      formData.append('message', messageText || (currentFile ? `Please analyze this file: ${currentFile.name}` : ''));
      formData.append('history', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))));
      if (currentFile) formData.append('file', currentFile);

      const response = await axios.post(
        `${API_URL}/share/${shareToken}/chat`,
        formData,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err: any) {
      let errorMessage = 'Failed to send message. Please try again.';
      if (err.response?.status === 401) errorMessage = 'Authentication required. Please log in.';
      else if (err.response?.status === 403) errorMessage = err.response.data.detail || 'Access denied.';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errorMessage}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };
  const handleStarterQuestion = (q: string) => sendMessage(q);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setAttachedFile(f); setAttachedImage(null); setImagePreview(null); }
    e.target.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setAttachedImage(f);
      setAttachedFile(null);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
    e.target.value = '';
  };

  const removeAttachment = () => { setAttachedFile(null); setAttachedImage(null); setImagePreview(null); };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40 animate-pulse">
            <span className="text-white text-2xl">✦</span>
          </div>
          <p className="text-white/50 text-sm">Loading agent...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Error</h2>
          <p className="text-white/60 text-sm mb-6">{error}</p>
          {error.includes('Authentication required') && (
            <button onClick={() => window.location.href = `/login?next=/share/${shareToken}`}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition text-sm font-medium shadow-lg shadow-indigo-500/30">
              Log In
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!agentInfo) return null;

  const caps = agentInfo.capabilities || {};
  const showStarters = messages.length <= 1 && agentInfo.starter_questions?.length > 0;
  const currentAttachment = attachedFile || attachedImage;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%)' }}>

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            {agentInfo.agent_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white truncate">{agentInfo.agent_name}</h1>
              {agentInfo.link_type === 'private' && (
                <span className="shrink-0 px-2 py-0.5 text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full">🔒 Private</span>
              )}
            </div>
            {agentInfo.agent_description && (
              <p className="text-xs text-white/40 truncate mt-0.5">{agentInfo.agent_description}</p>
            )}
            {/* Capability badges */}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {caps.web_search && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Web Search
                </span>
              )}
              {caps.file_handling && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/15 border border-blue-500/25 text-blue-400 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  File Upload
                </span>
              )}
              {caps.code_execution && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-500/15 border border-orange-500/25 text-orange-400 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  Code
                </span>
              )}
              {caps.rag && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/15 border border-purple-500/25 text-purple-400 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  Knowledge Base
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
            <span className="text-xs text-white/40">Online</span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
                <span className="text-white text-2xl">✦</span>
              </div>
              <p className="text-white/50 text-sm">Start a conversation with <span className="text-white/80 font-medium">{agentInfo.agent_name}</span></p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {message.role === 'assistant' ? <AgentIcon name={agentInfo.agent_name} /> : <UserIcon />}
              <div className={`max-w-[78%] flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                {message.attachmentName && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    {message.attachmentName}
                  </div>
                )}
                <div className={`rounded-2xl px-5 py-3.5 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-tr-sm text-white shadow-indigo-500/20'
                    : 'bg-white/10 backdrop-blur-sm border border-white/10 rounded-tl-sm'
                }`}>
                  {message.role === 'user'
                    ? <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                    : <div className="text-sm space-y-0.5">{renderMarkdown(message.content)}</div>
                  }
                </div>
              </div>
            </div>
          ))}

          {sending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Starter Questions ── */}
      {showStarters && (
        <div className="shrink-0 px-4 pb-3">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-white/30 mb-2 ml-1">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {agentInfo.starter_questions.map((question, index) => (
                <button key={index} onClick={() => handleStarterQuestion(question)} disabled={sending}
                  className="px-3.5 py-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="shrink-0 border-t border-white/10 bg-white/5 backdrop-blur-xl px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* Attachment preview */}
          {currentAttachment && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover ring-1 ring-indigo-500/40 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 font-medium truncate">{currentAttachment.name}</p>
                <p className="text-xs text-white/40">{(currentAttachment.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={removeAttachment} className="shrink-0 w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          )}

          {/* Input row */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* File upload buttons (only shown if capability enabled) */}
            <div className="flex gap-1 shrink-0">
              {caps.file_handling && (
                <>
                  {/* Document upload */}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}
                    title="Attach document"
                    className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 hover:border-white/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                  </button>
                  {/* Image upload */}
                  <button type="button" onClick={() => imageInputRef.current?.click()} disabled={sending}
                    title="Attach image"
                    className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 hover:border-white/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                </>
              )}
              {caps.web_search && (
                <div title="Web search enabled" className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                placeholder={currentAttachment ? "Add a message about your attachment… (optional)" : "Type your message… (Enter to send, Shift+Enter for newline)"}
                disabled={sending} rows={1}
                className="w-full resize-none bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ minHeight: '50px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button type="submit" disabled={(!input.trim() && !currentAttachment) || sending}
              className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95">
              <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7"/>
              </svg>
            </button>
          </form>

          <p className="text-xs text-white/20 text-center">Powered by AgentGrid</p>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".txt,.pdf,.csv,.json,.md,.docx,.xlsx,.pptx"
        onChange={handleFileSelect}
      />
      <input ref={imageInputRef} type="file" className="hidden"
        accept="image/*"
        onChange={handleImageSelect}
      />
    </div>
  );
};

export default SharedAgentChatPage;
