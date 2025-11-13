'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { UserProfile } from './UserProfile';
import type { User } from '@/lib/types';

const user: User = {
  id: 'user-1',
  email: 'jane@example.com',
  username: 'janedoe',
  full_name: 'Jane Doe',
  role: 'CREATOR',
  credits: 420,
  created_at: '',
  updated_at: '',
};

const meta: Meta<typeof UserProfile> = {
  title: 'Features/UserProfile',
  component: UserProfile,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UserProfile>;

export const Full: Story = {
  args: {
    user: {
      ...user,
      bio: 'Creator focused on research workflows.',
    },
    variant: 'full',
  },
};

export const Compact: Story = {
  args: {
    user,
    variant: 'compact',
  },
};
