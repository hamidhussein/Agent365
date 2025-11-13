'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { ToastContainer } from './Toast';
import { useUIStore } from '@/lib/store';

const meta: Meta<typeof ToastContainer> = {
  title: 'UI/Toast',
  component: ToastContainer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToastContainer>;

export const Default: Story = {
  render: () => {
    const { addToast } = useUIStore.getState();
    useEffect(() => {
      addToast({ type: 'success', message: 'Profile updated', duration: Infinity });
    }, [addToast]);
    return <ToastContainer />;
  },
};
