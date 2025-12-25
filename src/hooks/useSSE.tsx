import { useEffect, useRef, useCallback, useState } from 'react';
import { ENV } from '../config/env';

// Event types matching backend sse.EventType
export type SSEEventType = 'token_update' | 'job_update' | 'ping' | 'connected';

export interface TokenUpdateData {
  user_id: string;
  new_balance: number;
  cost?: number;
  reason?: string;
}

export interface JobUpdateData {
  job_id: number;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  url?: string;
  error?: string;
}

export interface SSEEvent {
  type: SSEEventType;
  data: TokenUpdateData | JobUpdateData | Record<string, unknown>;
  timestamp: string;
}

export interface UseSSEOptions {
  onTokenUpdate?: (data: TokenUpdateData) => void;
  onJobUpdate?: (data: JobUpdateData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export interface UseSSEReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnect: () => void;
}

/**
 * Hook for Server-Sent Events (SSE) connection to receive real-time updates
 * for token balance changes and job status updates.
 * 
 * This is the frontend counterpart to the Go SSE hub.
 * The connection is user-scoped and requires authentication.
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    onTokenUpdate,
    onJobUpdate,
    onConnected,
    onDisconnected,
    onError,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    // Check if we have auth token
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.log('🔌 SSE: No auth token, skipping connection');
      setConnectionStatus('disconnected');
      return;
    }

    const apiUrl = ENV.API_URL;
    if (!apiUrl) {
      console.warn('🔌 SSE: No API_URL configured');
      setConnectionStatus('error');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    console.log('🔌 SSE: Connecting...');

    // Note: EventSource doesn't support custom headers, so we use URL params
    // The backend should accept the token as a query parameter fallback
    const sseUrl = `${apiUrl}/api/sse?token=${encodeURIComponent(authToken)}`;

    try {
      const eventSource = new EventSource(sseUrl, {
        // withCredentials helps with cookie-based auth as fallback
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log('✅ SSE: Connection opened');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        onConnected?.();
      };

      eventSource.onerror = (event) => {
        console.error('❌ SSE: Connection error', event);
        setIsConnected(false);
        setConnectionStatus('error');
        onError?.(event);
        onDisconnected?.();

        // Attempt to reconnect with exponential backoff
        const attempts = reconnectAttempts.current;
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds

        console.log(`🔌 SSE: Will retry in ${delay / 1000}s (attempt ${attempts + 1})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      };

      // Handle token_update events
      eventSource.addEventListener('token_update', (event) => {
        try {
          const parsed = JSON.parse(event.data) as SSEEvent;
          const data = parsed.data as TokenUpdateData;
          console.log('🪙 SSE: Token update received', data);

          // Update localStorage
          try {
            const user = localStorage.getItem('user');
            if (user) {
              const parsed = JSON.parse(user);
              parsed.tokens_remaining = data.new_balance;
              localStorage.setItem('user', JSON.stringify(parsed));
            }
          } catch (e) {
            console.warn('Failed to update user in localStorage', e);
          }

          // Dispatch custom event for components to listen
          window.dispatchEvent(new CustomEvent('tokens-updated', {
            detail: {
              newBalance: data.new_balance,
              tokensCharged: data.cost
            }
          }));

          onTokenUpdate?.(data);
        } catch (e) {
          console.error('❌ SSE: Failed to parse token_update', e);
        }
      });

      // Handle job_update events
      eventSource.addEventListener('job_update', (event) => {
        try {
          const parsed = JSON.parse(event.data) as SSEEvent;
          const data = parsed.data as JobUpdateData;
          console.log('📋 SSE: Job update received', data);

          // Dispatch custom event for components to listen
          window.dispatchEvent(new CustomEvent('job-updated', {
            detail: data
          }));

          onJobUpdate?.(data);
        } catch (e) {
          console.error('❌ SSE: Failed to parse job_update', e);
        }
      });

      // Handle ping events (keepalive)
      eventSource.addEventListener('ping', () => {
        // Ping received, connection is alive
      });

      // Handle connected event
      eventSource.addEventListener('connected', (event) => {
        try {
          const parsed = JSON.parse(event.data) as SSEEvent;
          console.log('🔌 SSE: Connected event received', parsed.data);
        } catch (e) {
          console.warn('SSE: Could not parse connected event', e);
        }
      });

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('❌ SSE: Failed to create EventSource', error);
      setConnectionStatus('error');
    }
  }, [onTokenUpdate, onJobUpdate, onConnected, onDisconnected, onError]);

  // Reconnect function exposed to consumers
  const reconnect = useCallback(() => {
    cleanup();
    reconnectAttempts.current = 0;
    connect();
  }, [cleanup, connect]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  // Reconnect on auth token change
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          // Token added/changed, reconnect
          reconnect();
        } else {
          // Token removed, disconnect
          cleanup();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [reconnect, cleanup]);

  return {
    isConnected,
    connectionStatus,
    reconnect,
  };
}

/**
 * Global SSE connection status indicator component
 */
export function SSEConnectionIndicator({ className = '' }: { className?: string }) {
  const { isConnected, connectionStatus } = useSSE({ enabled: true });

  const statusColors = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  const statusLabels = {
    connecting: 'Connecting...',
    connected: 'Live',
    disconnected: 'Offline',
    error: 'Connection Error',
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]} ${isConnected ? 'animate-pulse' : ''}`}
        title={statusLabels[connectionStatus]}
      />
      <span className="text-gray-500">{statusLabels[connectionStatus]}</span>
    </div>
  );
}

export default useSSE;
