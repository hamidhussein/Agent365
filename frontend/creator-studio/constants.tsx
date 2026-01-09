import { Zap, Brain, Bot, Sparkles, Feather } from 'lucide-react';
import { Agent, LLMProviderConfig, ModelOption } from './types';

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    desc: 'Fastest reasoning & response time.',
    icon: <Zap size={18} className="text-blue-400" />,
    provider: 'google'
  },
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    desc: 'Complex reasoning, coding & math.',
    icon: <Brain size={18} className="text-purple-400" />,
    provider: 'google'
  },
  {
    id: 'gemini-flash-lite-latest',
    label: 'Gemini Flash Lite',
    desc: 'Cost-effective for high volume tasks.',
    icon: <Bot size={18} className="text-emerald-400" />,
    provider: 'google'
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    desc: 'Balanced for long context reasoning.',
    icon: <Brain size={18} className="text-sky-400" />,
    provider: 'google'
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    desc: 'Fast responses with strong quality.',
    icon: <Zap size={18} className="text-blue-300" />,
    provider: 'google'
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    desc: 'Next-gen speed and reasoning.',
    icon: <Zap size={18} className="text-indigo-300" />,
    provider: 'google'
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    desc: 'Flagship model by OpenAI.',
    icon: <Sparkles size={18} className="text-green-400" />,
    provider: 'openai'
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    desc: 'Smaller, faster, and cost-efficient.',
    icon: <Sparkles size={18} className="text-emerald-300" />,
    provider: 'openai'
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    desc: 'High-accuracy model for complex tasks.',
    icon: <Brain size={18} className="text-teal-300" />,
    provider: 'openai'
  },
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    desc: 'Great for quick, lower-cost responses.',
    icon: <Bot size={18} className="text-emerald-400" />,
    provider: 'openai'
  },
  {
    id: 'claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    desc: 'High intelligence model by Anthropic.',
    icon: <Feather size={18} className="text-orange-400" />,
    provider: 'anthropic'
  },
  {
    id: 'claude-3-opus',
    label: 'Claude 3 Opus',
    desc: 'Deep reasoning with high accuracy.',
    icon: <Feather size={18} className="text-amber-400" />,
    provider: 'anthropic'
  },
  {
    id: 'claude-3-haiku',
    label: 'Claude 3 Haiku',
    desc: 'Fast, lightweight assistant.',
    icon: <Feather size={18} className="text-rose-300" />,
    provider: 'anthropic'
  },
  {
    id: 'claude-3-5-haiku',
    label: 'Claude 3.5 Haiku',
    desc: 'Speed + quality for everyday tasks.',
    icon: <Feather size={18} className="text-orange-300" />,
    provider: 'anthropic'
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    label: 'Groq Llama 3.1 70B',
    desc: 'High quality with Groq low-latency inference.',
    icon: <Sparkles size={18} className="text-cyan-300" />,
    provider: 'groq'
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    label: 'Groq Llama 3.1 8B',
    desc: 'Fast responses with lower cost.',
    icon: <Zap size={18} className="text-cyan-200" />,
    provider: 'groq'
  },
  {
    id: 'groq/mixtral-8x7b-32768',
    label: 'Groq Mixtral 8x7B',
    desc: 'Mixture-of-experts for strong general performance.',
    icon: <Brain size={18} className="text-cyan-400" />,
    provider: 'groq'
  },
  {
    id: 'groq/gemma2-9b-it',
    label: 'Groq Gemma 2 9B',
    desc: 'Google Gemma served on Groq.',
    icon: <Bot size={18} className="text-cyan-300" />,
    provider: 'groq'
  },
  {
    id: 'llama-3.1-70b',
    label: 'Llama 3.1 70B',
    desc: 'High quality open-source via OpenAI-compatible gateways.',
    icon: <Bot size={18} className="text-slate-300" />,
    provider: 'llama'
  },
  {
    id: 'llama-3.1-8b',
    label: 'Llama 3.1 8B',
    desc: 'Lightweight open-source for faster responses.',
    icon: <Bot size={18} className="text-slate-300" />,
    provider: 'llama'
  }
];

export const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];

export const DEFAULT_AGENTS: Agent[] = [
  {
      id: '1',
      name: 'Technical Writer',
      description: 'Assists with documentation and code comments.',
      instruction: 'You are an expert technical writer. You prefer markdown.',
      model: 'gemini-3-flash-preview',
      files: [],
      inputs: [],
      isPublic: false,
      creditsPerRun: 1,
      createdAt: new Date().toISOString(),
      color: 'bg-indigo-500'
  },
  {
      id: '2',
      name: 'Python Guru',
      description: 'Advanced python coding assistant.',
      instruction: 'You are a python expert. Always provide type hints.',
      model: 'gemini-3-pro-preview',
      files: [],
      inputs: [],
      isPublic: false,
      creditsPerRun: 1,
      createdAt: new Date().toISOString(),
      color: 'bg-emerald-500'
  },
  {
      id: '3',
      name: 'Creative Storyteller',
      description: 'Generates creative fiction.',
      instruction: 'Write engaging stories.',
      model: 'claude-3-5-sonnet',
      files: [],
      inputs: [],
      isPublic: false,
      creditsPerRun: 1,
      createdAt: new Date().toISOString(),
      color: 'bg-orange-500'
  }
];

export const DEFAULT_LLM_CONFIGS: LLMProviderConfig[] = [
  {
    id: 'google',
    name: 'Google Gemini API',
    provider: 'google',
    enabled: true,
    apiKey: '',
    usage: 45,
    limit: 1000
  },
  {
    id: 'openai',
    name: 'OpenAI Platform',
    provider: 'openai',
    enabled: true,
    apiKey: '',
    usage: 78,
    limit: 500
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    provider: 'groq',
    enabled: false,
    apiKey: '',
    usage: 0,
    limit: 300
  },
  {
    id: 'anthropic',
    name: 'Anthropic Console',
    provider: 'anthropic',
    enabled: false,
    apiKey: '',
    usage: 12,
    limit: 200
  },
  {
    id: 'llama',
    name: 'Llama Gateway',
    provider: 'llama',
    enabled: false,
    apiKey: 'ollama',
    usage: 0,
    limit: 300
  }
];


