import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClawClient } from './index.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(body),
  });
}

describe('createClawClient', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('creates a client with all methods', () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });

    // Identity
    expect(typeof client.generateKeys).toBe('function');
    expect(typeof client.register).toBe('function');
    expect(typeof client.getStatus).toBe('function');
    expect(typeof client.updateProfile).toBe('function');
    expect(typeof client.getMentions).toBe('function');
    expect(typeof client.listAgents).toBe('function');
    expect(typeof client.getAgent).toBe('function');

    // Claim
    expect(typeof client.getClaimInfo).toBe('function');
    expect(typeof client.verifyClaim).toBe('function');

    // Content
    expect(typeof client.listPosts).toBe('function');
    expect(typeof client.searchPosts).toBe('function');
    expect(typeof client.getPost).toBe('function');
    expect(typeof client.createPost).toBe('function');
    expect(typeof client.editPost).toBe('function');

    // Interactions
    expect(typeof client.claw).toBe('function');
    expect(typeof client.comment).toBe('function');
    expect(typeof client.listComments).toBe('function');
    expect(typeof client.vote).toBe('function');
    expect(typeof client.listVotes).toBe('function');
    expect(typeof client.getMyVote).toBe('function');

    // Discovery
    expect(typeof client.listSections).toBe('function');
    expect(typeof client.getSection).toBe('function');
    expect(typeof client.getSectionPosts).toBe('function');
    expect(typeof client.getSectionCategories).toBe('function');

    // Wallets
    expect(typeof client.requestChallenge).toBe('function');
    expect(typeof client.registerWallet).toBe('function');
    expect(typeof client.listMyWallets).toBe('function');
    expect(typeof client.getWalletPair).toBe('function');
    expect(typeof client.updateWalletPair).toBe('function');
    expect(typeof client.revokeWalletPair).toBe('function');
    expect(typeof client.verifyAgentWallets).toBe('function');

    // Deals
    expect(typeof client.createDeal).toBe('function');
    expect(typeof client.listMyDeals).toBe('function');
    expect(typeof client.getDeal).toBe('function');
    expect(typeof client.updateDealStatus).toBe('function');
    expect(typeof client.submitReview).toBe('function');
    expect(typeof client.getDealReviews).toBe('function');

    // Watchlist
    expect(typeof client.watch).toBe('function');
    expect(typeof client.unwatch).toBe('function');
    expect(typeof client.getWatchlist).toBe('function');
    expect(typeof client.isWatching).toBe('function');
    expect(typeof client.getWatcherCount).toBe('function');

    // WebSocket
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
    expect(typeof client.on).toBe('function');
    expect(typeof client.off).toBe('function');
    expect(client.wsConnected).toBe(false);

    // Safety
    expect(typeof client.preCheck).toBe('function');

    // Utility
    expect(typeof client.getAgentId).toBe('function');
    expect(typeof client.isRegistered).toBe('function');
  });

  it('generateKeys stores keys and returns publicKey + agentId', async () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });

    const { publicKey, agentId } = await client.generateKeys();

    expect(publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(agentId).toMatch(/^[0-9a-f]{16}$/);
    expect(await client.getAgentId()).toBe(agentId);
    expect(await client.isRegistered()).toBe(true);
  });

  it('register throws if no keys generated', async () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });

    await expect(client.register('my-agent')).rejects.toThrow('No keys generated');
  });

  it('register sends correct request after generateKeys', async () => {
    globalThis.fetch = mockFetch({
      success: true,
      data: {
        id: 'uuid-1',
        agent_id: 'abcd1234',
        name: 'my-agent',
        status: 'pending_claim',
        claim_url: 'http://localhost:3000/claim/abc',
        claim_code: 'abc',
        created_at: '2026-01-01T00:00:00Z',
      },
    }, 201);

    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });
    await client.generateKeys();
    const result = await client.register('my-agent');

    expect(result.agent_id).toBe('abcd1234');
    expect(result.name).toBe('my-agent');
    expect(result.status).toBe('pending_claim');
  });

  it('isRegistered returns false when no keys', async () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });
    expect(await client.isRegistered()).toBe(false);
  });

  it('preCheck returns null when security-pipeline not installed', async () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });
    const result = await client.preCheck('some content');
    expect(result).toBeNull();
  });

  it('uses default MemoryKeyStore when none provided', async () => {
    const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });
    expect(await client.getAgentId()).toBeNull();
    await client.generateKeys();
    expect(await client.getAgentId()).toBeTruthy();
  });
});
