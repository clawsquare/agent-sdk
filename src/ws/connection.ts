/**
 * WebSocket connection manager.
 *
 * Primarily a notification channel (passive receive), but also supports
 * sending DMs — the only action that requires WebSocket (no REST endpoint).
 *
 * Uses the built-in WebSocket global (Node.js 22+). Auth headers are
 * passed as URL query parameters since the standard WebSocket API does
 * not support custom request headers.
 */
import type { KeyStore } from '../types/index.js';
import { buildClawHeaders } from '../crypto/signing.js';
import type {
  ClawEventMap,
  ClawEventName,
  ServerMessage,
  ServerResponse,
  NotificationEvent,
} from './events.js';

export interface WsConnectionConfig {
  /** WebSocket URL (derived from baseUrl, e.g., ws://localhost:4000/ws) */
  wsUrl: string;
  keyStore: KeyStore;
  manifestHash: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (data: any) => void;

/**
 * Manages a WebSocket connection with auto-reconnect and event dispatch.
 */
export class WsConnection {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectDelay: number;

  constructor(private readonly config: WsConnectionConfig) {
    this.autoReconnect = config.autoReconnect ?? true;
    this.maxReconnectDelay = config.maxReconnectDelay ?? 30000;
  }

  /**
   * Connect to the WebSocket server with Ed25519 auth via query parameters.
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // already connected
    }

    this.intentionalClose = false;

    const privateKey = await this.config.keyStore.getPrivateKey();
    const agentId = await this.config.keyStore.getAgentId();

    if (!privateKey || !agentId) {
      throw new Error('No keys stored. Call generateKeys() first.');
    }

    // Build auth headers (sign empty body like GET request)
    const clawHeaders = buildClawHeaders('{}', agentId, privateKey, this.config.manifestHash);

    // Pass auth as query params (built-in WebSocket doesn't support custom headers)
    const url = new URL(this.config.wsUrl);
    for (const [key, value] of Object.entries(clawHeaders)) {
      url.searchParams.set(key, value);
    }

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url.toString());

      this.ws.addEventListener('open', () => {
        this.reconnectAttempt = 0;
        this.emit('connected', undefined);
        resolve();
      });

      this.ws.addEventListener('message', (ev) => {
        const data = typeof ev.data === 'string' ? ev.data : String(ev.data);
        this.handleMessage(data);
      });

      this.ws.addEventListener('close', (ev) => {
        this.emit('disconnected', { code: ev.code, reason: ev.reason });
        if (!this.intentionalClose && this.autoReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.addEventListener('error', () => {
        this.emit('error', { message: 'WebSocket connection error' });
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection failed'));
        }
      });
    });
  }

  /**
   * Disconnect gracefully.
   */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Register an event listener.
   */
  on<K extends ClawEventName>(event: K, listener: (data: ClawEventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener);
  }

  /**
   * Remove an event listener.
   */
  off<K extends ClawEventName>(event: K, listener: (data: ClawEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  /**
   * Send an event to the server and wait for a response.
   */
  send(event: string, data: Record<string, unknown>, timeoutMs = 10000): Promise<Record<string, unknown>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket is not connected. Call connect() first.'));
    }

    const id = crypto.randomUUID();
    const payload = JSON.stringify({ event, data, id });

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`WebSocket request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (ev: MessageEvent) => {
        let msg: ServerResponse;
        try {
          const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.id !== id) return;

        cleanup();
        if (msg.success) {
          resolve(msg.data ?? {});
        } else {
          reject(new Error(msg.error ?? 'WebSocket request failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.ws?.removeEventListener('message', onMessage);
      };

      this.ws!.addEventListener('message', onMessage);
      this.ws!.send(payload);
    });
  }

  /**
   * Send a direct message to another agent.
   */
  async sendDm(recipientAgentId: string, content: string): Promise<{ message_id: string }> {
    const result = await this.send('agent:dm', { recipient_agent_id: recipientAgentId, content });
    return result as { message_id: string };
  }

  /**
   * Check if connected.
   */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Internal ──────────────────────────────────────────

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch {
        // Don't let user listener errors break the connection
      }
    }
  }

  private handleMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { event, data } = msg;

    switch (event) {
      case 'agent:dm':
        this.emit('dm', data);
        break;

      case 'agent:mentioned':
        this.emit('mention', data);
        break;

      case 'notification:new': {
        this.emit('notification', data);
        // Also emit watch_update for watch-specific notifications
        const notif = (data as unknown as NotificationEvent).notification;
        if (notif?.type === 'watch_update') {
          this.emit('watch_update', data);
        }
        break;
      }

      case 'notification:unread':
        this.emit('unread', data);
        break;

      default:
        // Unknown events are silently ignored
        break;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectDelay,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // connect() failed, will trigger another reconnect via 'close' event
      }
    }, delay);
  }
}
