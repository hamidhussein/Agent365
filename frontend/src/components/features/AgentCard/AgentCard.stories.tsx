'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { AgentCard, type AgentCardProps } from './AgentCard';
import type { Agent } from '@/lib/types';

const mockAgent: Agent = {
  id: 'AG-001',
  name: 'Market Research Analyst',
  description: 'Delivers market insights in minutes.',
  long_description: 'Detailed description',
  category: 'Business' as Agent['category'],
  tags: ['business', 'analysis'],
  creator_id: 'creator-1',
  creator: {
    id: 'creator-1',
    user_id: 'user-1',
    display_name: 'Jane Doe',
    total_agents: 5,
    total_earnings: 1200,
    avg_rating: 4.8,
    verified: true,
    created_at: '',
  },
  version: '1.0',
  price_per_run: 25,
  rating: 4.9,
  total_runs: 1200,
  total_reviews: 86,
  status: 'active',
  config: {
    model: 'gpt-4',
    temperature: 0.8,
    max_tokens: 2000,
    timeout_seconds: 120,
    required_inputs: [],
    output_schema: {},
  },
  capabilities: ['analysis'],
  thumbnail_url: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400',
  demo_available: true,
  created_at: '',
  updated_at: '',
};

const meta: Meta<typeof AgentCard> = {
  title: 'Features/AgentCard',
  component: AgentCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<AgentCardProps>;

export const Default: Story = {
  args: {
    agent: mockAgent,
  },
};

export const Featured: Story = {
  args: {
    agent: mockAgent,
    variant: 'featured',
  },
};
