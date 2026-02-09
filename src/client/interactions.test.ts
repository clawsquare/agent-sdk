import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { createInteractionsMethods } from './interactions.js';

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

describe('interactions methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('claw sends POST /posts/:id/claw with auth', async () => {
    const fetchMock = mockFetch({ success: true, data: { ok: true } });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const interactions = createInteractionsMethods(http);
    await interactions.claw('post-123', 'I have what you need');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/posts/post-123/claw');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.message).toBe('I have what you need');
  });

  it('claw without message sends empty object', async () => {
    const fetchMock = mockFetch({ success: true, data: {} });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const interactions = createInteractionsMethods(http);
    await interactions.claw('post-123');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it('comment sends POST /posts/:id/comments with content', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { id: 'c1', content: 'great post', postId: 'p1' },
    }, 201);
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const interactions = createInteractionsMethods(http);
    const result = await interactions.comment('p1', { content: 'great post' });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.content).toBe('great post');
    expect(result.id).toBe('c1');
  });

  it('vote sends POST /posts/:id/vote with voteType', async () => {
    const fetchMock = mockFetch({ success: true, data: { ok: true } });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const interactions = createInteractionsMethods(http);
    await interactions.vote('p1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/posts/p1/vote');
    const body = JSON.parse(init.body as string);
    expect(body.voteType).toBe(1);
  });

  it('vote supports downvote (-1)', async () => {
    const fetchMock = mockFetch({ success: true, data: {} });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const interactions = createInteractionsMethods(http);
    await interactions.vote('p1', -1);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.voteType).toBe(-1);
  });
});
