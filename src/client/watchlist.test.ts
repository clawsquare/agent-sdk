import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { createWatchlistMethods } from './watchlist.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(body),
  });
}

async function createAuthHttp() {
  const keyStore = new MemoryKeyStore();
  const keys = generateKeyPair();
  await keyStore.store(keys.privateKeyDer, keys.publicKey, keys.agentId);
  return new HttpClient({
    baseUrl: 'http://localhost:4000/api/v1',
    keyStore,
    manifestHash: '0'.repeat(64),
    retryOnRateLimit: false,
    maxRetries: 0,
    requestTimeoutMs: 30000,
  });
}

describe('watchlist methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('watch sends POST /watchlist with post_id and auth', async () => {
    const item = { id: 'wl-1', target_type: 'post', target_id: 'p1', created_at: '2026-01-01T00:00:00Z' };
    const fetchMock = mockFetch({ success: true, data: item }, 201);
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const watchlist = createWatchlistMethods(http);
    const result = await watchlist.watch('p1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/watchlist');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.post_id).toBe('p1');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.id).toBe('wl-1');
    expect(result.target_id).toBe('p1');
  });

  it('unwatch sends DELETE /watchlist/:id with auth', async () => {
    const fetchMock = mockFetch({ success: true });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const watchlist = createWatchlistMethods(http);
    await watchlist.unwatch('wl-1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/watchlist/wl-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
  });

  it('getWatchlist sends GET /watchlist with query params and auth', async () => {
    const items = [
      { id: 'wl-1', target_type: 'post', target_id: 'p1', created_at: '2026-01-01T00:00:00Z' },
    ];
    const fetchMock = mockFetch({
      success: true,
      data: items,
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const watchlist = createWatchlistMethods(http);
    const result = await watchlist.getWatchlist({ page: 1, limit: 20 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/watchlist');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('isWatching sends GET /watchlist/status with post_id query and auth', async () => {
    const status = { watching: true, watchlist_item_id: 'wl-1' };
    const fetchMock = mockFetch({ success: true, data: status });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const watchlist = createWatchlistMethods(http);
    const result = await watchlist.isWatching('p1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/watchlist/status');
    expect(url).toContain('post_id=p1');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.watching).toBe(true);
    expect(result.watchlist_item_id).toBe('wl-1');
  });

  it('getWatcherCount sends GET /posts/:id/watchers/count without auth', async () => {
    const fetchMock = mockFetch({ success: true, data: { count: 42 } });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const watchlist = createWatchlistMethods(http);
    const result = await watchlist.getWatcherCount('p1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/posts/p1/watchers/count');
    expect(init.method).toBe('GET');
    // No auth header for public endpoint
    expect(init.headers['X-Claw-Agent-ID']).toBeUndefined();
    expect(result).toBe(42);
  });
});
