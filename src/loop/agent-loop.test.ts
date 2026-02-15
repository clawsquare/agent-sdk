import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ClawClient } from '../types/index.js';
import { AgentLoop } from './agent-loop.js';

// ── Mock Client Factory ──────────────────────────────────

type Listener = (data: unknown) => void;

function createMockClient(overrides?: Partial<ClawClient>): ClawClient & {
  /** Emit an event to all registered listeners */
  _emit: (event: string, data: unknown) => void;
} {
  const listeners = new Map<string, Set<Listener>>();

  const base = {
    getAgentId: vi.fn().mockResolvedValue('test-agent-id'),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn((event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    }),
    wsConnected: false,
    _emit(event: string, data: unknown) {
      const set = listeners.get(event);
      if (set) {
        for (const fn of set) fn(data);
      }
    },
    ...overrides,
  };

  return base as unknown as ClawClient & { _emit: (event: string, data: unknown) => void };
}

// ── Tests ────────────────────────────────────────────────

describe('AgentLoop', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('start() resolves agentId and connects WebSocket', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: true });

    await loop.start();

    expect(client.getAgentId).toHaveBeenCalled();
    expect(client.connect).toHaveBeenCalled();
    expect(loop.context.agentId).toBe('test-agent-id');

    await loop.stop();
  });

  it('start() throws if already running', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: false });

    await loop.start();
    await expect(loop.start()).rejects.toThrow('already running');

    await loop.stop();
  });

  it('stop() is idempotent', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: false });

    await loop.start();
    await loop.stop();
    await loop.stop(); // second call should not throw
    expect(loop.running).toBe(false);
  });

  it('tick fires immediately when immediateFirstTick is true', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 60_000,
      immediateFirstTick: true,
      onTick,
      autoConnect: false,
    });

    await loop.start();
    // Flush microtask queue for the immediate tick
    await vi.advanceTimersByTimeAsync(0);

    expect(onTick).toHaveBeenCalledTimes(1);
    await loop.stop();
  });

  it('tick does not fire immediately when immediateFirstTick is false', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 5_000,
      immediateFirstTick: false,
      onTick,
      autoConnect: false,
    });

    await loop.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onTick).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    await loop.stop();
  });

  it('tick fires on interval', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 5_000,
      immediateFirstTick: false,
      onTick,
      autoConnect: false,
    });

    await loop.start();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onTick).toHaveBeenCalledTimes(2);

    await loop.stop();
  });

  it('tick increments tickCount and updates lastTickAt', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 1_000,
      immediateFirstTick: false,
      onTick: async () => {},
      autoConnect: false,
    });

    await loop.start();
    expect(loop.tickCount).toBe(0);
    expect(loop.context.lastTickAt).toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(loop.tickCount).toBe(1);
    expect(loop.context.lastTickAt).toBeTypeOf('number');

    await loop.stop();
  });

  it('tick error does not crash the loop', async () => {
    const onError = vi.fn();
    const onTick = vi.fn()
      .mockRejectedValueOnce(new Error('tick failure'))
      .mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 1_000,
      immediateFirstTick: false,
      onTick,
      onError,
      autoConnect: false,
    });

    await loop.start();

    // First tick throws
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'tick');
    expect(loop.running).toBe(true);

    // Second tick succeeds
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTick).toHaveBeenCalledTimes(2);

    await loop.stop();
  });

  it('onError is called with error and source when handler throws', async () => {
    const onError = vi.fn();
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 1_000,
      immediateFirstTick: false,
      onTick: async () => { throw new Error('boom'); },
      onError,
      autoConnect: false,
    });

    await loop.start();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]![1]).toBe('tick');

    await loop.stop();
  });

  it('routes dm event to onDm handler', async () => {
    const onDm = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, { onDm, autoConnect: false });

    await loop.start();

    const dmEvent = { from: { id: 'a1', name: 'Agent1', avatar_url: null }, content: 'hello', created_at: '2026-01-01' };
    client._emit('dm', dmEvent);
    await vi.advanceTimersByTimeAsync(0);

    expect(onDm).toHaveBeenCalledTimes(1);
    expect(onDm.mock.calls[0]![1]).toEqual(dmEvent);
    // First arg is context
    expect(onDm.mock.calls[0]![0].client).toBe(client);

    await loop.stop();
  });

  it('routes multiple event types independently', async () => {
    const onDm = vi.fn().mockResolvedValue(undefined);
    const onMention = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, { onDm, onMention, autoConnect: false });

    await loop.start();

    client._emit('dm', { content: 'hi' });
    client._emit('mention', { post_id: 'p1' });
    await vi.advanceTimersByTimeAsync(0);

    expect(onDm).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledTimes(1);

    await loop.stop();
  });

  it('event handler errors are isolated', async () => {
    const onError = vi.fn();
    const onDm = vi.fn().mockRejectedValue(new Error('dm fail'));
    const onMention = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, { onDm, onMention, onError, autoConnect: false });

    await loop.start();

    client._emit('dm', { content: 'hi' });
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'dm');

    client._emit('mention', { post_id: 'p1' });
    await vi.advanceTimersByTimeAsync(0);
    expect(onMention).toHaveBeenCalledTimes(1);

    await loop.stop();
  });

  it('requestStop() from tick handler triggers graceful stop', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      tickInterval: 1_000,
      immediateFirstTick: false,
      onTick: async (ctx) => {
        ctx.requestStop();
      },
      autoConnect: false,
    });

    await loop.start();
    expect(loop.running).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    // Allow stop to propagate
    await vi.advanceTimersByTimeAsync(0);

    expect(loop.running).toBe(false);
  });

  it('requestStop() from event handler triggers graceful stop', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      onDm: async (ctx) => { ctx.requestStop(); },
      autoConnect: false,
    });

    await loop.start();
    client._emit('dm', { content: 'stop' });
    await vi.advanceTimersByTimeAsync(0);

    expect(loop.running).toBe(false);
  });

  it('stop() removes all event listeners', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      onDm: async () => {},
      onMention: async () => {},
      autoConnect: false,
    });

    await loop.start();
    expect(client.on).toHaveBeenCalledTimes(2);

    await loop.stop();
    expect(client.off).toHaveBeenCalledTimes(2);
  });

  it('autoConnect: false skips WebSocket connection', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: false });

    await loop.start();
    expect(client.connect).not.toHaveBeenCalled();

    await loop.stop();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('initialState is available in context', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, {
      initialState: { seenPosts: ['p1', 'p2'] },
      autoConnect: false,
    });

    await loop.start();
    expect(loop.context.state['seenPosts']).toEqual(['p1', 'p2']);

    await loop.stop();
  });

  it('onStart fires after connect but before first tick', async () => {
    const order: string[] = [];
    const client = createMockClient({
      connect: vi.fn().mockImplementation(async () => { order.push('connect'); }),
    } as Partial<ClawClient>);
    const loop = new AgentLoop(client, {
      onStart: async () => { order.push('onStart'); },
      onTick: async () => { order.push('tick'); },
      immediateFirstTick: true,
      autoConnect: true,
    });

    await loop.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(order).toEqual(['connect', 'onStart', 'tick']);
    await loop.stop();
  });

  it('onStop fires on stop', async () => {
    const onStop = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient();
    const loop = new AgentLoop(client, { onStop, autoConnect: false });

    await loop.start();
    await loop.stop();

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('WebSocket connect failure is non-fatal — tick still works', async () => {
    const onError = vi.fn();
    const onTick = vi.fn().mockResolvedValue(undefined);
    const client = createMockClient({
      connect: vi.fn().mockRejectedValue(new Error('ws failed')),
    } as Partial<ClawClient>);
    const loop = new AgentLoop(client, {
      tickInterval: 1_000,
      immediateFirstTick: false,
      onTick,
      onError,
      autoConnect: true,
    });

    await loop.start();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'start');
    expect(loop.running).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    await loop.stop();
  });

  it('running getter reflects loop state', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: false });

    expect(loop.running).toBe(false);
    await loop.start();
    expect(loop.running).toBe(true);
    await loop.stop();
    expect(loop.running).toBe(false);
  });

  it('no tick without onTick handler', async () => {
    const client = createMockClient();
    const loop = new AgentLoop(client, { autoConnect: false });

    await loop.start();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(loop.tickCount).toBe(0);

    await loop.stop();
  });

  it('routes all WebSocket event types', async () => {
    const handlers = {
      onDm: vi.fn().mockResolvedValue(undefined),
      onMention: vi.fn().mockResolvedValue(undefined),
      onNotification: vi.fn().mockResolvedValue(undefined),
      onUnread: vi.fn().mockResolvedValue(undefined),
      onWatchUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const client = createMockClient();
    const loop = new AgentLoop(client, { ...handlers, autoConnect: false });

    await loop.start();

    const events: Array<[string, Record<string, unknown>]> = [
      ['dm', { content: 'hi' }],
      ['mention', { post_id: 'p1' }],
      ['notification', { notification: { type: 'claw' } }],
      ['unread', { notifications: [], count: 0 }],
      ['watch_update', { notification: { type: 'watch_update' } }],
    ];

    for (const [event, data] of events) {
      client._emit(event, data);
    }
    await vi.advanceTimersByTimeAsync(0);

    expect(handlers.onDm).toHaveBeenCalledTimes(1);
    expect(handlers.onMention).toHaveBeenCalledTimes(1);
    expect(handlers.onNotification).toHaveBeenCalledTimes(1);
    expect(handlers.onUnread).toHaveBeenCalledTimes(1);
    expect(handlers.onWatchUpdate).toHaveBeenCalledTimes(1);

    await loop.stop();
  });
});
