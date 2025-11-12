// ============= USER TYPES =============
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  credits: number;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  ADMIN = 'admin',
}

// ============= AGENT TYPES =============
export interface Agent {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  category: AgentCategory;
  tags: string[];
  creator_id: string;
  creator: Creator;
  version: string;
  price_per_run: number;
  rating: number;
  total_runs: number;
  total_reviews: number;
  status: AgentStatus;
  config: AgentConfig;
  capabilities: string[];
  limitations?: string[];
  thumbnail_url?: string;
  demo_available: boolean;
  created_at: string;
  updated_at: string;
}

export enum AgentCategory {
  CONTENT = 'content',
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  AUTOMATION = 'automation',
  DEVELOPMENT = 'development',
  DESIGN = 'design',
  MARKETING = 'marketing',
  CUSTOMER_SERVICE = 'customer_service',
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
}

export interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  required_inputs: AgentInput[];
  output_schema: Record<string, any>;
}

export interface AgentInput {
  name: string;
  type: 'text' | 'file' | 'url' | 'json';
  required: boolean;
  description: string;
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

// ============= CREATOR TYPES =============
export interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  social_links?: SocialLinks;
  total_agents: number;
  total_earnings: number;
  avg_rating: number;
  verified: boolean;
  created_at: string;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  linkedin?: string;
}

// ============= EXECUTION TYPES =============
export interface AgentExecution {
  id: string;
  agent_id: string;
  user_id: string;
  status: ExecutionStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error_message?: string;
  credits_used: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============= REVIEW TYPES =============
export interface Review {
  id: string;
  agent_id: string;
  user_id: string;
  user: Pick<User, 'id' | 'username' | 'avatar_url'>;
  rating: number;
  title: string;
  comment: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

// ============= CREDIT & PAYMENT TYPES =============
export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  reference_id?: string;
  created_at: string;
}

export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  EARNING = 'earning',
  PAYOUT = 'payout',
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  bonus_credits: number;
  popular: boolean;
}

// ============= API RESPONSE TYPES =============
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

// ============= FILTER & SEARCH TYPES =============
export interface AgentFilters {
  category?: AgentCategory;
  min_rating?: number;
  max_price?: number;
  tags?: string[];
  search_query?: string;
  sort_by?: 'popular' | 'rating' | 'newest' | 'price_low' | 'price_high';
}
