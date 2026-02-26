import React from 'react';

export type ViewState = 'dashboard' | 'admin-dashboard' | 'create-agent' | 'edit-agent' | 'chat';
export type UserRole = 'creator' | 'admin';

export interface KnowledgeFile {
  id: string;
  name: string;
  size: string;
}

export interface AgentInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'file';
  required: boolean;
  description?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  instruction: string;
  model?: string;
  files: KnowledgeFile[];
  inputs: AgentInput[];
  createdAt: string;
  color: string;
  isPublic?: boolean;
  welcomeMessage?: string;
  starterQuestions?: string[];
  capabilities?: string[];
  enabledCapabilities?: {
    codeExecution: boolean;
    webBrowsing: boolean;
    apiIntegrations: boolean;
    fileHandling: boolean;
  };
}

export interface AgentPayload {
  name: string;
  description: string;
  instruction: string;
  model?: string;
  color: string;
  inputs: AgentInput[];
  isPublic?: boolean;
  welcomeMessage?: string;
  starterQuestions?: string[];
  enabledCapabilities?: {
    codeExecution: boolean;
    webBrowsing: boolean;
    apiIntegrations: boolean;
    fileHandling: boolean;
  };
  capabilities?: string[];
  files?: string[];
}

export interface AgentSuggestPayload {
  name: string;
  description?: string;
  instruction?: string;
  notes?: string;
  action: 'suggest' | 'refine' | 'regenerate';
  model?: string;
}

export interface AgentSuggestResponse {
  description: string;
  instruction: string;
}

export interface AssistModelResponse {
  model: string | null;
}

export interface AssistModelUpdate {
  model: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'llama' | 'groq' | 'deepseek';
  status?: 'available' | 'coming-soon';
  enabled: boolean;
  apiKey: string;
  usage: number; // Percentage
  limit: number; // Cost limit
}

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
}

export interface ModelOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  family?: string; // e.g., "GPT-4 Family", "Claude 3.5 Family"
  provider: 'google' | 'openai' | 'anthropic' | 'llama' | 'groq' | 'deepseek';
  status?: 'available' | 'coming-soon';
  capabilities?: {
    codeExecution: boolean;
    fileHandling: 'advanced' | 'limited' | 'text-only' | 'none';
    webBrowsing: boolean;
    apiIntegrations: boolean;
  };
}
export interface PlatformSettings {
  SERPAPI_KEY?: string;
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_CX?: string;
}

export interface AgentBuildPayload {
  message: string;
  agent_id?: string;
  current_state?: Record<string, any>;
  history?: { role: 'user' | 'model' | 'system'; content: string }[];
}

export interface AgentBuildResponse {
  architect_message: string;
  suggested_changes?: Partial<AgentPayload>;
}
