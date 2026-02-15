/**
 * Autonomous agent loop.
 *
 * Combines periodic ticking (proactive scanning) with WebSocket event
 * routing (reactive responses). Handler errors are isolated — a failing
 * handler never crashes the loop.
 *
 * Usage:
 * ```ts
 * const loop = new AgentLoop(client, {
 *   tickInterval: 60_000,
 *   onTick: async (ctx) => { ... },
 *   onDm: async (ctx, event) => { ... },
 * });
 * await loop.start();
 * ```
 */
import type { ClawClient } from '../types/index.js';
import type { AgentLoopConfig, ErrorSource, ErrorHandler } from './types.js';
import { LoopContextImpl } from './context.js';

const DEFAULT_TICK_INTERVAL = 60_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (ctx: LoopContextImpl, data: any) => Promise<void>;

export class AgentLoop {
  private readonly client: ClawClient;
  private readonly config: AgentLoopConfig;
  private readonly tickInterval: number;
  private readonly autoConnect: boolean;
  private readonly immediateFirstTick: boolean;
  private readonly ctx: LoopContextImpl;
  private readonly errorHandler: ErrorHandler;

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private readonly boundListeners = new Map<string, (data: unknown) => void>();

  constructor(client: ClawClient, config: AgentLoopConfig = {}) {
    this.client = client;
    this.config = config;
    this.tickInterval = config.tickInterval ?? DEFAULT_TICK_INTERVAL;
    this.autoConnect = config.autoConnect ?? true;
    this.immediateFirstTick = config.immediateFirstTick ?? true;
    this.ctx = new LoopContextImpl(client, config.initialState ?? {});
    this.errorHandler = config.onError ?? defaultErrorHandler;
  }

  /**
   * Start the autonomous loop.
   *
   * 1. Resolves agent ID from key store
   * 2. Connects WebSocket (if autoConnect)
   * 3. Registers event listeners
   * 4. Calls onStart lifecycle hook
   * 5. Starts tick interval
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('AgentLoop is already running. Call stop() first.');
    }

    this.started = true;
    this.ctx.running = true;
    this.ctx.clearStopRequest();

    // Resolve agent ID
    this.ctx.agentId = await this.client.getAgentId();

    // Connect WebSocket
    if (this.autoConnect) {
      try {
        await this.client.connect();
      } catch (err) {
        this.errorHandler(err, 'start');
      }
    }

    // Register WebSocket event listeners
    this.registerListeners();

    // Lifecycle: onStart
    if (this.config.onStart) {
      await this.safeCall(() => this.config.onStart!(this.ctx), 'start');
    }

    // Start tick interval
    if (this.config.onTick) {
      if (this.immediateFirstTick) {
        void this.executeTick();
      }

      this.tickTimer = setInterval(() => {
        void this.executeTick();
      }, this.tickInterval);
    }
  }

  /**
   * Stop the autonomous loop gracefully.
   */
  async stop(): Promise<void> {
    if (!this.started) return;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.removeListeners();

    if (this.autoConnect) {
      this.client.disconnect();
    }

    this.ctx.running = false;
    this.started = false;

    if (this.config.onStop) {
      await this.safeCall(() => this.config.onStop!(this.ctx), 'stop');
    }
  }

  /** Whether the loop is currently running */
  get running(): boolean {
    return this.started;
  }

  /** Current tick count */
  get tickCount(): number {
    return this.ctx.tickCount;
  }

  /** Read-only access to the loop context */
  get context(): LoopContextImpl {
    return this.ctx;
  }

  // ── Internal ──────────────────────────────────────────

  private async executeTick(): Promise<void> {
    if (!this.started || !this.config.onTick) return;

    await this.safeCall(async () => {
      await this.config.onTick!(this.ctx);
      this.ctx.tickCount++;
      this.ctx.lastTickAt = Date.now();
    }, 'tick');

    if (this.ctx.isStopRequested) {
      void this.stop();
    }
  }

  private registerListeners(): void {
    const mappings: Array<{ event: string; handler: EventHandler | undefined; source: ErrorSource }> = [
      { event: 'dm', handler: this.config.onDm as EventHandler | undefined, source: 'dm' },
      { event: 'mention', handler: this.config.onMention as EventHandler | undefined, source: 'mention' },
      { event: 'notification', handler: this.config.onNotification as EventHandler | undefined, source: 'notification' },
      { event: 'unread', handler: this.config.onUnread as EventHandler | undefined, source: 'unread' },
      { event: 'watch_update', handler: this.config.onWatchUpdate as EventHandler | undefined, source: 'watch_update' },
    ];

    for (const { event, handler, source } of mappings) {
      if (!handler) continue;

      const bound = (data: unknown): void => {
        void this.safeCall(() => handler(this.ctx, data), source).then(() => {
          if (this.ctx.isStopRequested) {
            void this.stop();
          }
        });
      };
      this.boundListeners.set(event, bound);
      this.client.on(event, bound);
    }
  }

  private removeListeners(): void {
    for (const [event, listener] of this.boundListeners) {
      this.client.off(event, listener);
    }
    this.boundListeners.clear();
  }

  private async safeCall(fn: () => Promise<void>, source: ErrorSource): Promise<void> {
    try {
      await fn();
    } catch (err) {
      try {
        this.errorHandler(err, source);
      } catch {
        // Error handler itself threw — swallow to prevent crash
      }
    }
  }
}

function defaultErrorHandler(error: unknown, source: ErrorSource): void {
  console.error(`[AgentLoop] Error in ${source}:`, error);
}
