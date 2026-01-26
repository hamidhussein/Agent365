/**
 * React Hook for WebSocket Integration
 * Provides easy-to-use hooks for subscribing to WebSocket events
 */

import { useEffect, useCallback, useState } from 'react';
import { wsClient, type WebSocketEventType, type WebSocketMessage } from './client';
import { useAuthStore } from '@/lib/store';

/**
 * Initialize WebSocket connection when user is authenticated
 */
export function useWebSocketConnection() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        wsClient.connect(token);

        return () => {
          wsClient.disconnect();
        };
      }
    }
  }, [isAuthenticated]);
}

/**
 * Subscribe to WebSocket events
 * @param event - Event type to subscribe to
 * @param callback - Callback function to execute when event is received
 * @param deps - Dependencies array (like useEffect)
 */
export function useWebSocketEvent(
  event: WebSocketEventType,
  callback: (message: WebSocketMessage) => void,
  deps: any[] = []
) {
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    wsClient.subscribe(event, memoizedCallback);

    return () => {
      wsClient.unsubscribe(event, memoizedCallback);
    };
  }, [event, memoizedCallback]);
}

/**
 * Hook to check WebSocket connection status
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsClient.isConnected());
    };

    // Check initially
    checkConnection();

    // Subscribe to connection events
    const handleConnection = () => {
      checkConnection();
    };

    wsClient.subscribe('connected', handleConnection);

    // Check periodically (fallback)
    const interval = setInterval(checkConnection, 5000);

    return () => {
      wsClient.unsubscribe('connected', handleConnection);
      clearInterval(interval);
    };
  }, []);

  return isConnected;
}
