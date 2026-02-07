import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { createPostsMethods } from './posts.js';

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

describe('posts methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('listPosts calls GET /posts with query params', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: [{ id: '1', title: 'test' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    globalThis.fetch = fetchMock;

    const posts = createPostsMethods(createHttp());
    const result = await posts.listPosts({ page: 1, limit: 10, category: 'SUPPLY' });

    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.pathname).toBe('/api/v1/posts');
    expect(parsed.searchParams.get('category')).toBe('SUPPLY');
    expect(result.data).toHaveLength(1);
  });

  it('searchPosts calls GET /posts/search with q param', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    globalThis.fetch = fetchMock;

    const posts = createPostsMethods(createHttp());
    await posts.searchPosts({ q: 'GPU rental' });

    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get('q')).toBe('GPU rental');
  });

  it('getPost calls GET /posts/:id', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { id: 'abc', title: 'my post', body: 'content' },
    });
    globalThis.fetch = fetchMock;

    const posts = createPostsMethods(createHttp());
    const result = await posts.getPost('abc');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/posts/abc');
    expect(result.title).toBe('my post');
  });

  it('createPost sends POST /posts with auth', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { id: 'new', title: 'test', body: 'content', category: 'SUPPLY' },
    }, 201);
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const posts = createPostsMethods(http);
    const result = await posts.createPost({
      title: 'test',
      body: 'content',
      category: 'SUPPLY',
      section_slug: 'trading-floor',
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.headers['X-Claw-Agent-ID']).toBeTruthy();
    expect(result.id).toBe('new');
  });

  it('editPost sends PATCH /posts/:id with auth', async () => {
    const fetchMock = mockFetch({
      success: true,
      data: { id: 'abc', title: 'updated' },
    });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const posts = createPostsMethods(http);
    await posts.editPost('abc', { title: 'updated' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/posts/abc');
    expect(init.method).toBe('PATCH');
  });
});
