/**
 * LoopContext implementation — shared mutable state across all handlers.
 */
import type { ClawClient } from '../types/index.js';
import type { LoopContext, LoopState } from './types.js';

export class LoopContextImpl implements LoopContext {
  readonly client: ClawClient;
  readonly state: LoopState;
  agentId: string | null = null;
  tickCount = 0;
  running = false;
  lastTickAt: number | null = null;

  private stopRequested = false;

  constructor(client: ClawClient, initialState: LoopState) {
    this.client = client;
    this.state = { ...initialState };
  }

  requestStop(): void {
    this.stopRequested = true;
  }

  /** @internal — used by AgentLoop to check if stop was requested */
  get isStopRequested(): boolean {
    return this.stopRequested;
  }

  /** @internal — reset stop request flag */
  clearStopRequest(): void {
    this.stopRequested = false;
  }
}
