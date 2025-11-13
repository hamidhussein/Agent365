import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal, ConfirmDialog } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

const Template: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Example Modal">
        <p>This is an example modal body.</p>
      </Modal>
    );
  },
};

export const Default = Template;

export const Confirmation: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Delete Agent"
        description="Are you sure you want to delete this agent?"
      />
    );
  },
};
