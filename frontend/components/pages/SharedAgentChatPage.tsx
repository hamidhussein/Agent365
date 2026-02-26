import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import axios from 'axios';

interface SharedAgentChatPageProps {
  shareToken: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentInfo {
  agent_id: string;
  agent_name: string;
  agent_description: string;
  welcome_message: string | null;
  starter_questions: string[];
  link_type: string;
  share_token: string;
}

const SharedAgentChatPage: React.FC<SharedAgentChatPageProps> = ({ shareToken }) => {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

  useEffect(() => {
    loadAgentInfo();
  }, [shareToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAgentInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/share/${shareToken}/info`, {
        headers: getAuthHeaders()
      });
      
      setAgentInfo(response.data);
      
      // Add welcome message if exists
      if (response.data.welcome_message) {
        setMessages([{
          role: 'assistant',
          content: response.data.welcome_message
        }]);
      }
    } catch (err: any) {
      console.error('Failed to load agent info:', err);
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in to access this agent.');
      } else if (err.response?.status === 403) {
        setError(err.response.data.detail || 'You don\'t have access to this agent.');
      } else if (err.response?.status === 404) {
        setError('This share link is invalid or has been removed.');
      } else {
        setError('Failed to load agent. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('auth_token_session');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await axios.post(
        `${API_URL}/share/${shareToken}/chat`,
        {
          message: messageText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        },
        {
          headers: getAuthHeaders()
        }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      let errorMessage = 'Failed to send message. Please try again.';
      if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      } else if (err.response?.status === 403) {
        errorMessage = err.response.data.detail || 'Access denied.';
      }
      
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStarterQuestion = (question: string) => {
    sendMessage(question);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            {error.includes('Authentication required') && (
              <button
                onClick={() => window.location.href = `/login?next=/share/${shareToken}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!agentInfo) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">{agentInfo.agent_name}</h1>
          <p className="text-sm text-gray-600 mt-1">{agentInfo.agent_description}</p>
          {agentInfo.link_type === 'private' && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              🔒 Private Access
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              </div>
            </div>
          ))}
          
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <LoadingSpinner size="sm" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Starter Questions */}
      {messages.length <= 1 && agentInfo.starter_questions && agentInfo.starter_questions.length > 0 && (
        <div className="px-6 py-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-gray-600 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {agentInfo.starter_questions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleStarterQuestion(question)}
                  disabled={sending}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SharedAgentChatPage;
