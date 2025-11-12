import { useCallback } from 'react';
import { useUIStore } from '@/lib/store';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export function useToast() {
  const { addToast, removeToast } = useUIStore();

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      addToast({ message, type, duration });
    },
    [addToast]
  );

  return {
    toast,
    success: (message: string) => toast(message, 'success'),
    error: (message: string) => toast(message, 'error'),
    warning: (message: string) => toast(message, 'warning'),
    info: (message: string) => toast(message, 'info'),
    dismiss: removeToast,
  };
}
