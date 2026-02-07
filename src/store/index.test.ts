import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { MemoryKeyStore } from './index.js';
import { FileKeyStore } from './file.js';
import { generateKeyPair } from '../crypto/keys.js';

describe('MemoryKeyStore', () => {
  it('starts empty', async () => {
    const store = new MemoryKeyStore();
    expect(await store.getPrivateKey()).toBeNull();
    expect(await store.getPublicKey()).toBeNull();
    expect(await store.getAgentId()).toBeNull();
  });

  it('stores and retrieves keys', async () => {
    const store = new MemoryKeyStore();
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();

    await store.store(privateKeyDer, publicKey, agentId);

    expect(await store.getPublicKey()).toBe(publicKey);
    expect(await store.getAgentId()).toBe(agentId);
    const retrieved = await store.getPrivateKey();
    expect(retrieved).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(retrieved!).toString('hex')).toBe(Buffer.from(privateKeyDer).toString('hex'));
  });

  it('clears all keys', async () => {
    const store = new MemoryKeyStore();
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();

    await store.store(privateKeyDer, publicKey, agentId);
    await store.clear();

    expect(await store.getPrivateKey()).toBeNull();
    expect(await store.getPublicKey()).toBeNull();
    expect(await store.getAgentId()).toBeNull();
  });
});

describe('FileKeyStore', () => {
  const testPath = join(tmpdir(), `claw-sdk-test-${Date.now()}.json`);

  afterEach(async () => {
    try { await unlink(testPath); } catch { /* ignore */ }
  });

  it('starts empty when file does not exist', async () => {
    const store = new FileKeyStore(testPath);
    expect(await store.getPrivateKey()).toBeNull();
    expect(await store.getPublicKey()).toBeNull();
    expect(await store.getAgentId()).toBeNull();
  });

  it('persists and retrieves keys from file', async () => {
    const store = new FileKeyStore(testPath);
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();

    await store.store(privateKeyDer, publicKey, agentId);

    // Read with a new instance to confirm file persistence
    const store2 = new FileKeyStore(testPath);
    expect(await store2.getPublicKey()).toBe(publicKey);
    expect(await store2.getAgentId()).toBe(agentId);
    const retrieved = await store2.getPrivateKey();
    expect(Buffer.from(retrieved!).toString('hex')).toBe(Buffer.from(privateKeyDer).toString('hex'));
  });

  it('sets file permissions to 0600', async () => {
    const store = new FileKeyStore(testPath);
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();

    await store.store(privateKeyDer, publicKey, agentId);

    const fileStat = await stat(testPath);
    // 0o600 = owner read+write only
    expect(fileStat.mode & 0o777).toBe(0o600);
  });

  it('clears by deleting the file', async () => {
    const store = new FileKeyStore(testPath);
    const { publicKey, privateKeyDer, agentId } = generateKeyPair();

    await store.store(privateKeyDer, publicKey, agentId);
    await store.clear();

    expect(await store.getPrivateKey()).toBeNull();
  });

  it('clear is idempotent (no error if file missing)', async () => {
    const store = new FileKeyStore(testPath);
    await expect(store.clear()).resolves.toBeUndefined();
  });
});
