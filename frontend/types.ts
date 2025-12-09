


export interface User {
    id?: string;
    email?: string;
    username?: string;
    full_name?: string;
    role?: string;
    // Frontend specific or mapped fields
    name: string;
    creditBalance: number;
    favoriteAgentIds: string[];
}

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    transaction_type: 'purchase' | 'spend' | 'refund' | 'bonus';
    description: string;
    reference_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Execution {
    id: string;
    agent_id: string;
    user_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    inputs: Record<string, any>;
    outputs?: Record<string, any>;
    error_message?: string;
    credits_used: number;
    created_at: string;
    updated_at: string;
}

export interface CreditPackage {
    id: string;
    credits: number;
    price: number; // in USD
    bonus: number; // percentage
    isBestValue: boolean;
}

export interface Review {
    id: string;
    user: {
        name: string;
        avatarUrl: string;
    };
    rating: number;
    comment: string;
    date: string;
}

export interface Agent {
    id: string;
    name: string;
    creator: {
        name: string;
        username: string;
        avatarUrl: string;
        bio: string;
    };
    description: string;
    longDescription: string;
    category?: string;
    rating: number;
    reviewCount: number;
    runs: number;
    imageUrl: string;
    tags: string[];
    price: number; // in credits
    successRate: number; // percentage
    avgRunTime: number; // in seconds
    status: 'Live' | 'Draft' | 'Paused';
    inputSchema: InputField[];
    mockResult: string;
    reviews: Review[];
}

export type Category = string;

// Types for Agent Creation Wizard

export type InputFieldType = 'text' | 'textarea' | 'number' | 'select';

export interface InputFieldOption {
    value: string;
    label: string;
}

export interface InputField {
    id: string;
    name: string;
    label: string;
    type: InputFieldType;
    placeholder?: string;
    required: boolean;
    options?: InputFieldOption[];
}

export type LLMProvider = 'google' | 'openai' | 'anthropic';

export interface LLMModel {
    id: string;
    name: string;
    provider: LLMProvider;
}

export type Tool = 'web_search' | 'calculator';

export interface LLMConfig {
    model: string; // model id
    systemPrompt: string;
    tools: Tool[];
}

export interface PricingConfig {
    pricePerRun: number; // in credits
    demoEnabled: boolean;
    freeRuns: number;
}

export interface NewAgentData {
    // Step 1
    name: string;
    description: string;
    category: string;
    tags: string[];
    // Step 2
    inputSchema: InputField[];
    // Step 3
    llmConfig: LLMConfig;
    // Step 4
    pricingConfig: PricingConfig;
}

export type AgentRunStatus = 'idle' | 'running' | 'completed';
