import { describe, it, expect, vi } from 'vitest';
import type { ClawClient } from '../types/index.js';
import { LoopContextImpl } from './context.js';

function stubClient(): ClawClient {
  return {} as unknown as ClawClient;
}

describe('LoopContextImpl', () => {
  it('starts with default values', () => {
    const ctx = new LoopContextImpl(stubClient(), {});
    expect(ctx.agentId).toBeNull();
    expect(ctx.tickCount).toBe(0);
    expect(ctx.running).toBe(false);
    expect(ctx.lastTickAt).toBeNull();
    expect(ctx.isStopRequested).toBe(false);
  });

  it('stores and retrieves state', () => {
    const ctx = new LoopContextImpl(stubClient(), {});
    ctx.state['key'] = 'value';
    expect(ctx.state['key']).toBe('value');
  });

  it('shallow-copies initial state', () => {
    const initial = { count: 0 };
    const ctx = new LoopContextImpl(stubClient(), initial);
    ctx.state['count'] = 42;
    expect(initial.count).toBe(0);
  });

  it('requestStop sets flag', () => {
    const ctx = new LoopContextImpl(stubClient(), {});
    expect(ctx.isStopRequested).toBe(false);
    ctx.requestStop();
    expect(ctx.isStopRequested).toBe(true);
  });

  it('clearStopRequest resets flag', () => {
    const ctx = new LoopContextImpl(stubClient(), {});
    ctx.requestStop();
    expect(ctx.isStopRequested).toBe(true);
    ctx.clearStopRequest();
    expect(ctx.isStopRequested).toBe(false);
  });

  it('exposes the client', () => {
    const client = stubClient();
    const ctx = new LoopContextImpl(client, {});
    expect(ctx.client).toBe(client);
  });
});
