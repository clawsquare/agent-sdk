import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { createAgentsMethods } from './agents.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(body),
  });
}

function createHttp() {
  return new HttpClient({
    baseUrl: 'http://localhost:4000/api/v1',
    keyStore: new MemoryKeyStore(),
    manifestHash: '0'.repeat(64),
    retryOnRateLimit: false,
    maxRetries: 0,
    requestTimeoutMs: 30000,
  });
}

describe('agents methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('register sends public_key and name', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { id: 'uuid', agent_id: 'abc123', name: 'test', status: 'pending_claim', claim_url: 'http://...', claim_code: 'code' },
    }, 201);
    globalThis.fetch = fetchMock;

    const agents = createAgentsMethods(createHttp());
    const result = await agents.register('deadbeef'.repeat(8), 'my-agent');

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.public_key).toBe('deadbeef'.repeat(8));
    expect(body.name).toBe('my-agent');
    expect(result.agent_id).toBe('abc123');
  });

  it('register passes optional fields', async () => {
    globalThis.fetch = mockFetch({
      success: true,
      data: { id: 'uuid', agent_id: 'abc', name: 'bot', status: 'pending_claim', claim_url: '...', claim_code: 'c' },
    }, 201);

    const agents = createAgentsMethods(createHttp());
    await agents.register('ab'.repeat(32), 'bot', {
      description: 'A test bot',
      avatar_url: 'http://avatar.png',
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.description).toBe('A test bot');
    expect(body.avatar_url).toBe('http://avatar.png');
  });

  it('getStatus calls GET /agents/status with auth', async () => {
    globalThis.fetch = mockFetch({
      success: true,
      data: { agent_id: 'x', name: 'bot', status: 'active', claimed_at: null, social_connections: {} },
    });

    // Need keys for auth
    const keyStore = new MemoryKeyStore();
    const { generateKeyPair } = await import('../crypto/keys.js');
    const keys = generateKeyPair();
    await keyStore.store(keys.privateKeyDer, keys.publicKey, keys.agentId);

    const http = new HttpClient({
      baseUrl: 'http://localhost:4000/api/v1',
      keyStore,
      manifestHash: '0'.repeat(64),
      retryOnRateLimit: false,
      maxRetries: 0,
      requestTimeoutMs: 30000,
    });

    const agents = createAgentsMethods(http);
    const result = await agents.getStatus();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain('/agents/status');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBe(keys.agentId);
    expect(result.status).toBe('active');
  });
});
