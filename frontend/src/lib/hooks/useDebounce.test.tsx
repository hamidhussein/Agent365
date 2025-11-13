import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  vi.useFakeTimers();

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'start' } }
    );

    expect(result.current).toBe('start');
    rerender({ value: 'next' });
    expect(result.current).toBe('start');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('next');
  });
});
