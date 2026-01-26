/**
 * WebSocket Client for Real-Time Updates
 * Manages WebSocket connection and event subscriptions
 */

export type WebSocketEventType =
  | 'review_requested'
  | 'review_status_changed'
  | 'review_completed'
  | 'review_in_progress'
  | 'new_notification'
  | 'connected'
  | 'ping'
  | 'pong'
  | 'error';

export interface WebSocketMessage {
  event: WebSocketEventType;
  timestamp: string;
  data: any;
}

export type EventCallback = (message: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds
  private listeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private isIntentionallyClosed = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Use environment variable or default to backend port 8001
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
    // Convert http:// to ws:// and https:// to wss://
    this.url = baseUrl.replace(/^http/, 'ws') + '/ws';
    console.log('[WebSocket] Using URL:', this.url);
  }

  /**
   * Connect to WebSocket server with authentication token
   */
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.token = token;
    this.isIntentionallyClosed = false;

    try {
      // Append token as query parameter
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      console.log('[WebSocket] Connecting to:', this.url);
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(event: WebSocketEventType, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);
    console.log(`[WebSocket] Subscribed to event: ${event}`);
  }

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe(event: WebSocketEventType, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Send a message to the server
   */
  send(event: string, data?: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = { event, data, timestamp: new Date().toISOString() };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  private handleOpen() {
    console.log('[WebSocket] Connected successfully');
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000; // Reset delay
    this.startPing();

    // Notify all listeners of connection
    this.notifyListeners('connected' as WebSocketEventType, {
      event: 'connected',
      timestamp: new Date().toISOString(),
      data: {},
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', message);

      // Handle pong response
      if (message.event === 'pong') {
        return; // Just a keepalive, no need to notify
      }

      this.notifyListeners(message.event, message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    this.stopPing();

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('[WebSocket] Error occurred:', event);
  }

  private notifyListeners(event: WebSocketEventType, message: WebSocketMessage) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error(`[WebSocket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.isIntentionallyClosed && this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  private startPing() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping');
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Global singleton instance
export const wsClient = new WebSocketClient();
