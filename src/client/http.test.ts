import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { ClawApiError } from '../types/errors.js';

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  });
}

describe('HttpClient', () => {
  const originalFetch = globalThis.fetch;
  let keyStore: MemoryKeyStore;

  beforeEach(() => {
    keyStore = new MemoryKeyStore();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createClient(overrides?: Partial<ConstructorParameters<typeof HttpClient>[0]>) {
    return new HttpClient({
      baseUrl: 'http://localhost:4000/api/v1',
      keyStore,
      manifestHash: '0'.repeat(64),
      retryOnRateLimit: true,
      maxRetries: 1,
      requestTimeoutMs: 30000,
      ...overrides,
    });
  }

  it('makes GET requests', async () => {
    const fetchMock = mockFetch(200, { success: true, data: { id: '1' } });
    globalThis.fetch = fetchMock;

    const client = createClient();
    const result = await client.request({ method: 'GET', path: '/posts' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:4000/api/v1/posts');
    expect(init.method).toBe('GET');
    expect(result).toEqual({ success: true, data: { id: '1' } });
  });

  it('appends query parameters', async () => {
    const fetchMock = mockFetch(200, { success: true, data: [] });
    globalThis.fetch = fetchMock;

    const client = createClient();
    await client.request({
      method: 'GET',
      path: '/posts',
      query: { page: 2, limit: 10, category: undefined },
    });

    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('limit')).toBe('10');
    expect(parsed.searchParams.has('category')).toBe(false);
  });

  it('sends JSON body for POST requests', async () => {
    const fetchMock = mockFetch(201, { success: true, data: {} });
    globalThis.fetch = fetchMock;

    const client = createClient();
    await client.request({
      method: 'POST',
      path: '/posts',
      body: { title: 'test', body: 'content' },
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe('{"title":"test","body":"content"}');
  });

  it('adds X-Claw-* headers for authenticated requests', async () => {
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();
    await keyStore.store(privateKeyDer, publicKey, agentId);

    const fetchMock = mockFetch(200, { success: true, data: {} });
    globalThis.fetch = fetchMock;

    const client = createClient();
    await client.request({
      method: 'GET',
      path: '/agents/status',
      auth: true,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Claw-Agent-ID']).toBe(agentId);
    expect(headers['X-Claw-Signature']).toBeTruthy();
    expect(headers['X-Claw-Nonce']).toBeTruthy();
    expect(headers['X-Claw-Timestamp']).toBeTruthy();
    expect(headers['X-Claw-Manifest-Hash']).toBe('0'.repeat(64));
  });

  it('throws SDK_NO_KEYS when auth required but no keys stored', async () => {
    const client = createClient();

    await expect(
      client.request({ method: 'GET', path: '/agents/status', auth: true }),
    ).rejects.toThrow(ClawApiError);

    try {
      await client.request({ method: 'GET', path: '/agents/status', auth: true });
    } catch (err) {
      expect((err as ClawApiError).errorCode).toBe('SDK_NO_KEYS');
    }
  });

  it('throws ClawApiError on non-OK responses', async () => {
    globalThis.fetch = mockFetch(401, {
      success: false,
      error_code: 'AUTH_INVALID_SIG',
      message: 'Invalid signature',
    });

    const client = createClient();

    try {
      await client.request({ method: 'GET', path: '/agents/status' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ClawApiError);
      const apiErr = err as ClawApiError;
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.errorCode).toBe('AUTH_INVALID_SIG');
      expect(apiErr.message).toBe('Invalid signature');
    }
  });

  it('retries on 429 with Retry-After header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '0' }),
        json: () => Promise.resolve({ error_code: 'RATE_LIMITED', message: 'slow down' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ success: true, data: { ok: true } }),
      });

    globalThis.fetch = fetchMock;

    const client = createClient();
    const result = await client.request({ method: 'GET', path: '/posts' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  it('does not retry on 429 when retryOnRateLimit is false', async () => {
    globalThis.fetch = mockFetch(429, { error_code: 'RATE_LIMITED', message: 'slow down' }, { 'Retry-After': '1' });

    const client = createClient({ retryOnRateLimit: false });

    await expect(
      client.request({ method: 'GET', path: '/posts' }),
    ).rejects.toThrow(ClawApiError);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const fetchMock = mockFetch(200, { success: true });
    globalThis.fetch = fetchMock;

    const client = createClient({ baseUrl: 'http://localhost:4000/api/v1/' });
    await client.request({ method: 'GET', path: '/posts' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:4000/api/v1/posts');
  });
});
