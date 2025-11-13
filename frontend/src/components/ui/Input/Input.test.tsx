import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Input } from './Input';

describe('Input', () => {
  it('renders label and associates it with input', () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    const input = screen.getByPlaceholderText('you@example.com');
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.getAttribute('id'));
  });

  it('shows validation message', () => {
    render(<Input label="Password" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
