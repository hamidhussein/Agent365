import React from 'react';

export type ViewState = 'auth' | 'dashboard' | 'admin-dashboard' | 'create-agent' | 'edit-agent' | 'chat' | 'marketplace' | 'public-chat';
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
  isPublic: boolean;
  creditsPerRun: number;
  createdAt: string;
  color: string;
}

export interface AgentPayload {
  name: string;
  description: string;
  instruction: string;
  model?: string;
  color: string;
  inputs: AgentInput[];
  isPublic: boolean;
  creditsPerRun: number;
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
  provider: 'google' | 'openai' | 'anthropic' | 'llama' | 'groq';
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
  provider: 'google' | 'openai' | 'anthropic' | 'llama' | 'groq';
  status?: 'available' | 'coming-soon';
}
