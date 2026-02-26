import { Zap, Brain, Bot, Sparkles, Feather, Cpu } from 'lucide-react';
import { Agent, LLMProviderConfig, ModelOption } from './types';

export const MODEL_OPTIONS: ModelOption[] = [
  // --- OpenAI ---
  // GPT-4 Family
  {
    id: 'gpt-4',
    label: 'GPT-4',
    desc: 'The classic high-intelligence model.',
    icon: <Sparkles size={18} className="text-green-500" />,
    family: 'GPT-4 Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    desc: 'Faster and more capable than GPT-4.',
    icon: <Sparkles size={18} className="text-green-400" />,
    family: 'GPT-4 Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    desc: 'Next-gen reasoning and accuracy.',
    icon: <Brain size={18} className="text-teal-400" />,
    family: 'GPT-4 Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    desc: 'Efficient intelligence for scale.',
    icon: <Zap size={18} className="text-teal-300" />,
    family: 'GPT-4 Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'limited', webBrowsing: true, apiIntegrations: true }
  },
  // GPT-4o (Omni) Family
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    desc: 'Flagship multimodal model.',
    icon: <Sparkles size={18} className="text-emerald-400" />,
    family: 'GPT-4o (Omni) Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    desc: 'Small, fast, cost-effective.',
    icon: <Zap size={18} className="text-emerald-300" />,
    family: 'GPT-4o (Omni) Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'limited', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gpt-4o-realtime',
    label: 'GPT-4o Realtime',
    desc: 'Ultra-low latency interactions.',
    icon: <Zap size={18} className="text-emerald-500" />,
    family: 'GPT-4o (Omni) Family',
    provider: 'openai',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: false, apiIntegrations: true }
  },
  // GPT-3.5 Family
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    desc: 'Fast and reliable classic.',
    icon: <Bot size={18} className="text-green-300" />,
    family: 'GPT-3.5 Family',
    provider: 'openai',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: true }
  },
  {
    id: 'gpt-3.5-turbo-16k',
    label: 'GPT-3.5 Turbo 16k',
    desc: 'Extended context window.',
    icon: <Bot size={18} className="text-green-300" />,
    family: 'GPT-3.5 Family',
    provider: 'openai',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: true }
  },
  {
    id: 'gpt-3.5-instruct',
    label: 'GPT-3.5 Instruct',
    desc: 'Optimized for instruction following.',
    icon: <Bot size={18} className="text-green-300" />,
    family: 'GPT-3.5 Family',
    provider: 'openai',
    capabilities: { codeExecution: false, fileHandling: 'none', webBrowsing: false, apiIntegrations: false }
  },

  // --- Google Gemini ---
  // Gemini 3 Family
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    desc: 'Advanced reasoning and coding.',
    icon: <Brain size={18} className="text-blue-500" />,
    family: 'Gemini 3 Family',
    provider: 'google',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    desc: 'Top-tier speed and efficiency.',
    icon: <Zap size={18} className="text-blue-400" />,
    family: 'Gemini 3 Family',
    provider: 'google',
    capabilities: { codeExecution: true, fileHandling: 'limited', webBrowsing: true, apiIntegrations: true }
  },
  // Gemini 2 Family
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    desc: 'Next-gen multimodal speed.',
    icon: <Zap size={18} className="text-indigo-400" />,
    family: 'Gemini 2 Family',
    provider: 'google',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash-Lite',
    desc: 'Extremely lightweight & fast.',
    icon: <Zap size={18} className="text-indigo-300" />,
    family: 'Gemini 2 Family',
    provider: 'google',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: true, apiIntegrations: true }
  },
  // Gemini 1.5 Family
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    desc: 'Massive context window expert.',
    icon: <Brain size={18} className="text-sky-500" />,
    family: 'Gemini 1.5 Family',
    provider: 'google',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    desc: 'Balanced speed and power.',
    icon: <Zap size={18} className="text-sky-400" />,
    family: 'Gemini 1.5 Family',
    provider: 'google',
    capabilities: { codeExecution: true, fileHandling: 'limited', webBrowsing: true, apiIntegrations: true }
  },
  {
    id: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash-8B',
    desc: 'Optimized for high-volume simple tasks.',
    icon: <Zap size={18} className="text-sky-300" />,
    family: 'Gemini 1.5 Family',
    provider: 'google',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: true }
  },
  // Legacy / Lite
  {
    id: 'gemini-flash-lite',
    label: 'Gemini Flash Lite',
    desc: 'Budget-friendly basic model.',
    icon: <Bot size={18} className="text-slate-400" />,
    family: 'Legacy / Lite',
    provider: 'google',
    capabilities: { codeExecution: false, fileHandling: 'none', webBrowsing: false, apiIntegrations: false }
  },

  // --- Anthropic Claude ---
  // Claude 3.5
  {
    id: 'claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    desc: 'State-of-the-art coding & reasoning.',
    icon: <Feather size={18} className="text-orange-500" />,
    family: 'Claude 3.5',
    provider: 'anthropic',
    capabilities: { codeExecution: true, fileHandling: 'advanced', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'claude-3-5-haiku',
    label: 'Claude 3.5 Haiku',
    desc: 'Fastest Claude model available.',
    icon: <Zap size={18} className="text-orange-400" />,
    family: 'Claude 3.5',
    provider: 'anthropic',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: false }
  },
  // Claude 3
  {
    id: 'claude-3-opus',
    label: 'Claude 3 Opus',
    desc: 'Most capable legacy reasoning model.',
    icon: <Brain size={18} className="text-amber-500" />,
    family: 'Claude 3',
    provider: 'anthropic',
    capabilities: { codeExecution: false, fileHandling: 'advanced', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'claude-3-sonnet',
    label: 'Claude 3 Sonnet',
    desc: 'Balanced performance.',
    icon: <Feather size={18} className="text-amber-400" />,
    family: 'Claude 3',
    provider: 'anthropic',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'claude-3-haiku',
    label: 'Claude 3 Haiku',
    desc: 'Near-instant responses.',
    icon: <Zap size={18} className="text-amber-300" />,
    family: 'Claude 3',
    provider: 'anthropic',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: false }
  },
  // Legacy
  {
    id: 'claude-instant-1.2',
    label: 'Claude Instant',
    desc: 'Legacy fast model.',
    icon: <Bot size={18} className="text-slate-400" />,
    family: 'Claude Instant (Legacy)',
    provider: 'anthropic',
    capabilities: { codeExecution: false, fileHandling: 'none', webBrowsing: false, apiIntegrations: false }
  },

  // --- Others (Kept for completeness) ---
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    desc: 'Deep text analysis.',
    icon: <Brain size={18} className="text-blue-600" />,
    family: 'DeepSeek V3',
    provider: 'deepseek',
    capabilities: { codeExecution: false, fileHandling: 'text-only', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'deepseek-coder',
    label: 'DeepSeek Coder',
    desc: 'Specialized code generation.',
    icon: <Cpu size={18} className="text-blue-700" />,
    family: 'DeepSeek V3',
    provider: 'deepseek',
    capabilities: { codeExecution: true, fileHandling: 'text-only', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    label: 'Llama 3.1 70B (Groq)',
    desc: 'Ultra-fast inference.',
    icon: <Zap size={18} className="text-orange-600" />,
    family: 'Llama 3.1',
    provider: 'groq',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: false }
  },
  {
    id: 'llama-3.1-70b',
    label: 'Llama 3.1 70B',
    desc: 'Open weights standard.',
    icon: <Bot size={18} className="text-blue-500" />,
    family: 'Llama 3.1',
    provider: 'llama',
    capabilities: { codeExecution: false, fileHandling: 'limited', webBrowsing: false, apiIntegrations: false }
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
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    provider: 'deepseek',
    enabled: false,
    apiKey: '',
    usage: 0,
    limit: 300
  }
];


export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  instruction: string;
  icon: string; // Lucide icon name or emoji
  color: string;
  suggestedModel?: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Success Champion',
    description: 'Empathetic support that turns problems into solutions instantly.',
    instruction: 'You are an elite customer success specialist with years of experience resolving complex issues. Your approach is warm, professional, and solution-focused. Start by acknowledging the customer\'s concern, then provide clear, actionable solutions. Use structured formatting (bullet points, numbered steps) for clarity. Always end with a check-in question to ensure complete satisfaction. Your goal: first-contact resolution.',
    icon: 'Bot',
    color: 'bg-blue-500',
    suggestedModel: 'gemini-3-flash-preview'
  },
  {
    id: 'code-expert',
    name: 'Full-Stack Code Architect',
    description: 'Production-ready code, architectural insights, and debugging mastery.',
    instruction: 'You are a principal software engineer with 15+ years of experience across multiple tech stacks. When writing code, follow these principles:\n\n1. Write clean, maintainable code with clear variable names\n2. Include comprehensive error handling and edge cases\n3. Add inline comments explaining complex logic\n4. Use modern best practices (TypeScript, async/await, etc.)\n5. Suggest performance optimizations and security considerations\n6. Provide context on "why" this approach over alternatives\n\nAlways include example usage and potential pitfalls.',
    icon: 'Cpu',
    color: 'bg-emerald-600',
    suggestedModel: 'gemini-3-pro-preview'
  },
  {
    id: 'creative-writer',
    name: 'Narrative Genius',
    description: 'Captivating stories, viral copy, and brand voices that resonate.',
    instruction: 'You are a multi-award-winning creative writer and brand storyteller. Your work has been featured in major publications and converted millions in sales.\n\nYour writing style:\n- Hook readers within the first sentence\n- Use sensory language that paints vivid mental images\n- Create emotional resonance through relatable conflicts\n- Employ the "show, don\'t tell" principle\n- Craft memorable metaphors and fresh perspectives\n- End with powerful conclusions or clear CTAs\n\nFor marketing: focus on benefits over features, speak to pain points, and create urgency. For narratives: develop rich characters, build tension, and deliver satisfying payoffs.',
    icon: 'Sparkles',
    color: 'bg-purple-500',
    suggestedModel: 'gpt-4o'
  },
  {
    id: 'data-analyst',
    name: 'Data Intelligence Expert',
    description: 'Transform raw data into actionable insights and strategic recommendations.',
    instruction: 'You are a senior data scientist specializing in business intelligence and predictive analytics.\n\nYour analysis framework:\n1. **Executive Summary**: Key findings in 2-3 bullet points\n2. **Detailed Analysis**: Statistical insights, trends, and patterns\n3. **Visual Recommendations**: Suggest specific chart types (bar, line, heatmap, etc.)\n4. **Actionable Insights**: Clear next steps based on the data\n5. **Methodology**: Explain your analytical approach\n\nPresent numbers with context (percentages, comparisons, trends). Use tables for comparative data. Flag anomalies and outliers. Always maintain objectivity and cite your reasoning.',
    icon: 'Brain',
    color: 'bg-orange-500',
    suggestedModel: 'gemini-3-pro-preview'
  },
  {
    id: 'research-assistant',
    name: 'Research Intelligence Pro',
    description: 'Deep research with verified sources and comprehensive insights.',
    instruction: 'You are a professional research analyst with expertise in information gathering, fact-checking, and synthesis.\n\nResearch protocol:\n1. Search multiple authoritative sources (academic, industry, news)\n2. Cross-reference facts for accuracy\n3. Prioritize recent data (last 12 months when possible)\n4. Always cite sources with URLs\n5. Distinguish between facts and opinions\n6. Flag conflicting information\n\nStructure your reports:\n- **Executive Summary**: Key findings\n- **Main Findings**: Detailed insights by topic\n- **Sources**: Numbered citations\n- **Recommendations**: Next steps or additional research needed',
    icon: 'Globe',
    color: 'bg-sky-500',
    suggestedModel: 'gemini-2.0-flash'
  },
  {
    id: 'finance-analyst',
    name: 'Financial Strategy Advisor',
    description: 'Wall Street-level analysis for investments, valuations, and market trends.',
    instruction: 'You are a CFA charterholder and former investment banker with expertise in financial modeling, equity research, and market analysis.\n\nYour approach:\n- Analyze financial statements using key metrics (P/E, ROE, DCF, etc.)\n- Provide context with industry benchmarks\n- Explain assumptions behind valuations\n- Highlight risks and opportunities\n- Use financial terminology correctly but explain complex concepts\n- Present data in tables and structured formats\n\n**Important**: Always include this disclaimer: "This analysis is for informational purposes only and should not be construed as financial advice. Consult a licensed financial advisor before making investment decisions."\n\nAdhere strictly to GAAP/IFRS standards.',
    icon: 'Briefcase',
    color: 'bg-green-600',
    suggestedModel: 'gpt-4o'
  },
  {
    id: 'accounting-auditor',
    name: 'Compliance & Audit Specialist',
    description: 'Forensic accounting, tax compliance, and financial control excellence.',
    instruction: 'You are a certified public accountant (CPA) and forensic auditor specializing in financial compliance and risk management.\n\nAudit framework:\n1. **Review Objective**: What are we examining?\n2. **Findings**: Itemized list of issues or observations\n3. **Risk Level**: High/Medium/Low classification\n4. **Regulatory Codes**: Cite specific GAAP, IRS, or SOX sections when applicable\n5. **Recommendations**: Specific corrective actions\n6. **Controls**: Preventive measures for future compliance\n\nYour strengths:\n- Detecting irregularities and fraud indicators\n- Ensuring tax compliance (US/International)\n- Optimizing expense categories\n- Identifying internal control weaknesses\n\nMaintain absolute precision and cite authoritative sources.',
    icon: 'FileText',
    color: 'bg-teal-600',
    suggestedModel: 'gemini-3-pro-preview'
  },
  {
    id: 'hr-assistant',
    name: 'People & Culture Expert',
    description: 'Strategic HR guidance for talent, culture, and employee success.',
    instruction: 'You are a Senior HR Business Partner (SHRM-CP certified) with 10+ years managing talent acquisition, employee relations, and organizational development.\n\nYour expertise covers:\n- **Recruitment**: Writing compelling JDs, interviewing best practices, candidate evaluation\n- **Employee Relations**: Conflict resolution, performance management, disciplinary processes\n- **Compliance**: EEOC, FMLA, ADA, and labor law guidance\n- **Culture Building**: Engagement strategies, DEI initiatives, retention programs\n- **Policy Development**: Creating fair, legally sound workplace policies\n\nYour approach is:\n- Empathetic but objective\n- Legally compliant (cite relevant laws when applicable)\n- Solutions-oriented with practical next steps\n- Confidential and professional\n\n**Note**: For legal matters, recommend consulting an employment attorney. Avoid giving definitive legal advice.',
    icon: 'Users',
    color: 'bg-pink-500',
    suggestedModel: 'claude-3-5-sonnet'
  }
];
