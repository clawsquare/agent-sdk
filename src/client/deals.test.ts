import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { createDealsMethods } from './deals.js';

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

describe('deals methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('createDeal sends POST /deals with deal data and auth', async () => {
    const deal = {
      id: 'deal-1',
      post_id: 'p1',
      initiator_agent_id: 'a1',
      counterparty_agent_id: 'a2',
      expected_amount: 100,
      chain: 'evm',
      currency: 'USDC',
      status: 'open',
      metadata: null,
    };
    const fetchMock = mockFetch({ success: true, data: deal }, 201);
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const deals = createDealsMethods(http);
    const result = await deals.createDeal({
      counterparty_agent_id: 'a2',
      post_id: 'p1',
      expected_amount: 100,
      chain: 'evm',
      currency: 'USDC',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.counterparty_agent_id).toBe('a2');
    expect(body.expected_amount).toBe(100);
    expect(body.chain).toBe('evm');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.id).toBe('deal-1');
  });

  it('listMyDeals sends GET /deals with query params and auth', async () => {
    const deals = [
      { id: 'deal-1', post_id: null, initiator_agent_id: 'a1', counterparty_agent_id: 'a2', expected_amount: 50, chain: 'evm', currency: 'USDC', status: 'open', metadata: null },
    ];
    const fetchMock = mockFetch({
      success: true,
      data: deals,
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const dealsMethods = createDealsMethods(http);
    const result = await dealsMethods.listMyDeals({ status: 'open', page: 1, limit: 20 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals');
    expect(url).toContain('status=open');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('getDeal sends GET /deals/:id with auth', async () => {
    const deal = {
      id: 'deal-1',
      post_id: 'p1',
      initiator_agent_id: 'a1',
      counterparty_agent_id: 'a2',
      expected_amount: 100,
      chain: 'evm',
      currency: 'USDC',
      status: 'settled',
      metadata: null,
    };
    const fetchMock = mockFetch({ success: true, data: deal });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const deals = createDealsMethods(http);
    const result = await deals.getDeal('deal-1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals/deal-1');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.id).toBe('deal-1');
    expect(result.status).toBe('settled');
  });

  it('updateDealStatus sends PATCH /deals/:id/status with auth', async () => {
    const deal = {
      id: 'deal-1',
      post_id: 'p1',
      initiator_agent_id: 'a1',
      counterparty_agent_id: 'a2',
      expected_amount: 100,
      chain: 'evm',
      currency: 'USDC',
      status: 'settled',
      metadata: null,
    };
    const fetchMock = mockFetch({ success: true, data: deal });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const deals = createDealsMethods(http);
    const result = await deals.updateDealStatus('deal-1', { status: 'settled' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals/deal-1/status');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.status).toBe('settled');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.status).toBe('settled');
  });

  it('submitReview sends POST /deals/:id/reviews with auth', async () => {
    const review = {
      id: 'rev-1',
      deal_id: 'deal-1',
      reviewer_agent_id: 'a1',
      rating: 'positive',
      actual_amount: 100,
      comment: 'Great deal',
    };
    const fetchMock = mockFetch({ success: true, data: review }, 201);
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const deals = createDealsMethods(http);
    const result = await deals.submitReview('deal-1', {
      actual_amount: 100,
      rating: 'positive',
      comment: 'Great deal',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals/deal-1/reviews');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.actual_amount).toBe(100);
    expect(body.rating).toBe('positive');
    expect(body.comment).toBe('Great deal');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.id).toBe('rev-1');
  });

  it('getDealReviews sends GET /deals/:id/reviews with auth', async () => {
    const reviews = [
      { id: 'rev-1', deal_id: 'deal-1', reviewer_agent_id: 'a1', rating: 'positive', actual_amount: 100, comment: null },
    ];
    const fetchMock = mockFetch({ success: true, data: reviews });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const deals = createDealsMethods(http);
    const result = await deals.getDealReviews('deal-1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/deals/deal-1/reviews');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0]!.rating).toBe('positive');
  });
});
