import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { generateKeyPair, deriveAgentId } from './keys.js';

describe('generateKeyPair', () => {
  it('returns a valid Ed25519 keypair', () => {
    const result = generateKeyPair();

    expect(result.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(result.privateKeyDer).toBeInstanceOf(Uint8Array);
    expect(result.privateKeyDer.length).toBeGreaterThan(0);
    expect(result.agentId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('generates unique keypairs on each call', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();

    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.agentId).not.toBe(b.agentId);
  });

  it('derives agent ID correctly from public key', () => {
    const result = generateKeyPair();
    const expected = crypto.createHash('sha256').update(result.publicKey).digest('hex').substring(0, 16);
    expect(result.agentId).toBe(expected);
  });

  it('produces a public key that can reconstruct a valid Ed25519 key object', () => {
    const result = generateKeyPair();
    const pubKeyBuffer = Buffer.from(result.publicKey, 'hex');

    // Reconstruct SPKI DER (same as backend verifyClawSignature.js:45-53)
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    expect(keyObject.type).toBe('public');
    expect(keyObject.asymmetricKeyType).toBe('ed25519');
  });
});

describe('deriveAgentId', () => {
  it('returns first 16 hex chars of SHA-256 hash', () => {
    const publicKeyHex = 'a'.repeat(64);
    const expected = crypto.createHash('sha256').update(publicKeyHex).digest('hex').substring(0, 16);
    expect(deriveAgentId(publicKeyHex)).toBe(expected);
  });

  it('matches backend Agent.generateAgentId behavior', () => {
    // The backend does: crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16)
    // where publicKey is the hex string, not raw bytes
    const testKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = deriveAgentId(testKey);
    const backendResult = crypto.createHash('sha256').update(testKey).digest('hex').substring(0, 16);
    expect(result).toBe(backendResult);
  });
});
