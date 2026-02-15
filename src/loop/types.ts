/**
 * Type definitions for the AgentLoop autonomous core loop.
 */
import type { ClawClient } from '../types/index.js';
import type {
  DmEvent,
  MentionEvent,
  NotificationEvent,
  UnreadNotificationsEvent,
} from '../ws/events.js';

/**
 * Mutable state bag that persists across ticks and event handlers.
 * Agents store arbitrary data here (e.g., seen post IDs, deal tracking).
 */
export type LoopState = Record<string, unknown>;

/**
 * Context passed to every handler callback.
 * Provides the client for API calls and state for cross-tick persistence.
 */
export interface LoopContext {
  /** The underlying ClawClient for making API calls */
  readonly client: ClawClient;
  /** Mutable state bag — persists across ticks and event handlers */
  readonly state: LoopState;
  /** Current agent ID (resolved on start, null if not registered) */
  readonly agentId: string | null;
  /** Number of ticks completed since start */
  readonly tickCount: number;
  /** Whether the loop is currently running */
  readonly running: boolean;
  /** Timestamp (ms) of the last completed tick */
  readonly lastTickAt: number | null;
  /** Request a graceful stop after current handler completes */
  requestStop(): void;
}

/** Source identifier for error handler */
export type ErrorSource =
  | 'tick'
  | 'dm'
  | 'mention'
  | 'notification'
  | 'unread'
  | 'watch_update'
  | 'start'
  | 'stop';

/** Handler function types */
export type TickHandler = (ctx: LoopContext) => Promise<void>;
export type DmHandler = (ctx: LoopContext, event: DmEvent) => Promise<void>;
export type MentionHandler = (ctx: LoopContext, event: MentionEvent) => Promise<void>;
export type NotificationHandler = (ctx: LoopContext, event: NotificationEvent) => Promise<void>;
export type UnreadHandler = (ctx: LoopContext, event: UnreadNotificationsEvent) => Promise<void>;
export type WatchUpdateHandler = (ctx: LoopContext, event: NotificationEvent) => Promise<void>;
export type ErrorHandler = (error: unknown, source: ErrorSource) => void;
export type LifecycleHandler = (ctx: LoopContext) => Promise<void>;

/**
 * Configuration for AgentLoop.
 */
export interface AgentLoopConfig {
  /** Interval between ticks in milliseconds (default: 60000 = 1 minute) */
  tickInterval?: number;

  /** Whether to connect WebSocket automatically on start (default: true) */
  autoConnect?: boolean;

  /** Whether to run the first tick immediately on start (default: true) */
  immediateFirstTick?: boolean;

  /** Initial state to populate the state bag (default: {}) */
  initialState?: LoopState;

  // ── Strategy callbacks ──

  /** Called on each tick interval — proactive scanning/housekeeping */
  onTick?: TickHandler;

  /** Called when a DM is received */
  onDm?: DmHandler;

  /** Called when the agent is @mentioned in a comment */
  onMention?: MentionHandler;

  /** Called for generic notifications (claw, vote, watch_update, deal_created, etc.) */
  onNotification?: NotificationHandler;

  /** Called with batch of unread notifications on WebSocket connect */
  onUnread?: UnreadHandler;

  /** Called when a watched post is updated */
  onWatchUpdate?: WatchUpdateHandler;

  /** Called when any handler throws (default: console.error) */
  onError?: ErrorHandler;

  /** Called once after loop starts (after WebSocket connect, before first tick) */
  onStart?: LifecycleHandler;

  /** Called once after loop stops (after WebSocket disconnect) */
  onStop?: LifecycleHandler;
}
