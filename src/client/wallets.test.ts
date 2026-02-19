import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from './http.js';
import { MemoryKeyStore } from '../store/index.js';
import { generateKeyPair } from '../crypto/keys.js';
import { createWalletsMethods } from './wallets.js';

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

function createUnauthHttp() {
  const keyStore = new MemoryKeyStore();
  return new HttpClient({
    baseUrl: 'http://localhost:4000/api/v1',
    keyStore,
    manifestHash: '0'.repeat(64),
    retryOnRateLimit: false,
    maxRetries: 0,
    requestTimeoutMs: 30000,
  });
}

describe('wallets methods', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('requestChallenge sends POST /wallets/challenge with auth', async () => {
    const challengeData = {
      challenge_id: 'ch-1',
      message: 'Sign this message',
      expires_at: '2026-02-07T12:00:00Z',
    };
    const fetchMock = mockFetch({ success: true, data: challengeData });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.requestChallenge({
      chain: 'evm',
      wallet_address: '0xabc123',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets/challenge');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.chain).toBe('evm');
    expect(body.wallet_address).toBe('0xabc123');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.challenge_id).toBe('ch-1');
  });

  it('registerWallet sends POST /wallets/register with auth', async () => {
    const walletPair = {
      id: 'wp-1',
      chain: 'evm',
      wallet_address: '0xabc123',
      label: null,
      verified: true,
      verified_at: '2026-02-07T12:00:00Z',
      status: 'active',
    };
    const fetchMock = mockFetch({ success: true, data: walletPair });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.registerWallet({
      challenge_id: 'ch-1',
      signature: 'sig-abc',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets/register');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.challenge_id).toBe('ch-1');
    expect(body.signature).toBe('sig-abc');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.id).toBe('wp-1');
  });

  it('listMyWallets sends GET /wallets with optional status query', async () => {
    const walletList = [
      { id: 'wp-1', chain: 'evm', wallet_address: '0xabc', label: null, verified: true, verified_at: '2026-02-07T12:00:00Z', status: 'active' },
    ];
    const fetchMock = mockFetch({ success: true, data: walletList });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.listMyWallets({ status: 'active' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets');
    expect(url).toContain('status=active');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('wp-1');
  });

  it('getWalletPair sends GET /wallets/:pairId without auth', async () => {
    const walletPair = {
      id: 'wp-1',
      chain: 'evm',
      wallet_address: '0xabc123',
      label: 'primary',
      verified: true,
      verified_at: '2026-02-07T12:00:00Z',
      status: 'active',
    };
    const fetchMock = mockFetch({ success: true, data: walletPair });
    globalThis.fetch = fetchMock;

    const http = createUnauthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.getWalletPair('wp-1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets/wp-1');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeUndefined();
    expect(result.id).toBe('wp-1');
    expect(result.label).toBe('primary');
  });

  it('updateWalletPair sends PATCH /wallets/:pairId with body and auth', async () => {
    const updated = {
      id: 'wp-1',
      chain: 'evm',
      wallet_address: '0xabc123',
      label: 'updated',
      verified: true,
      verified_at: '2026-02-07T12:00:00Z',
      status: 'active',
    };
    const fetchMock = mockFetch({ success: true, data: updated });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.updateWalletPair('wp-1', {
      label: 'updated',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets/wp-1');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.label).toBe('updated');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.label).toBe('updated');
  });

  it('revokeWalletPair sends DELETE /wallets/:pairId with auth', async () => {
    const revoked = {
      id: 'wp-1',
      chain: 'evm',
      wallet_address: '0xabc123',
      label: null,
      verified: true,
      verified_at: '2026-02-07T12:00:00Z',
      status: 'revoked',
    };
    const fetchMock = mockFetch({ success: true, data: revoked });
    globalThis.fetch = fetchMock;

    const http = await createAuthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.revokeWalletPair('wp-1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/wallets/wp-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Claw-Agent-ID']).toBeDefined();
    expect(result.status).toBe('revoked');
  });

  it('verifyAgentWallets sends GET /agents/:agentId/wallets without auth', async () => {
    const walletList = [
      { id: 'wp-1', chain: 'evm', wallet_address: '0xabc', label: null, verified: true, verified_at: '2026-02-07T12:00:00Z', status: 'active' },
    ];
    const fetchMock = mockFetch({ success: true, data: walletList });
    globalThis.fetch = fetchMock;

    const http = createUnauthHttp();
    const wallets = createWalletsMethods(http);
    const result = await wallets.verifyAgentWallets('agent-42');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/agents/agent-42/wallets');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Claw-Agent-ID']).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});
