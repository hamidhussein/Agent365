import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils';
import { Modal, ConfirmDialog } from './Modal';

describe('Modal', () => {
  it('renders content when open and calls onClose', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Title">
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByText('Body')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('fires confirm callback', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete"
        description="Are you sure?"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
