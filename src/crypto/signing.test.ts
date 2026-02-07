import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { buildSignatureMessage, signMessage, generateNonce, buildClawHeaders } from './signing.js';
import { generateKeyPair } from './keys.js';

describe('buildSignatureMessage', () => {
  it('concatenates body + nonce + timestamp', () => {
    const body = { title: 'hello' };
    const nonce = 'abc-123';
    const timestamp = '1700000000';
    const result = buildSignatureMessage(body, nonce, timestamp);
    expect(result).toBe('{"title":"hello"}abc-1231700000000');
  });

  it('handles string body (already serialized)', () => {
    const bodyString = '{"x":1}';
    const result = buildSignatureMessage(bodyString, 'n', 't');
    expect(result).toBe('{"x":1}nt');
  });

  it('handles empty object body (GET requests)', () => {
    const result = buildSignatureMessage({}, 'nonce', '123');
    expect(result).toBe('{}nonce123');
  });
});

describe('signMessage + verify (round-trip)', () => {
  it('produces a valid Ed25519 signature verifiable by backend logic', () => {
    const { publicKey, privateKeyDer } = generateKeyPair();

    const body = { title: 'test post', body: 'content' };
    const nonce = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = buildSignatureMessage(body, nonce, timestamp);

    const signature = signMessage(message, privateKeyDer);

    // Verify using same logic as backend verifyClawSignature.js:34-68
    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyObject,
      Buffer.from(signature, 'base64'),
    );

    expect(isValid).toBe(true);
  });

  it('fails verification with wrong key', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();

    const message = buildSignatureMessage({}, 'nonce', '123');
    const signature = signMessage(message, keys1.privateKeyDer);

    // Verify with wrong public key
    const wrongPubKeyBuffer = Buffer.from(keys2.publicKey, 'hex');
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        wrongPubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyObject,
      Buffer.from(signature, 'base64'),
    );

    expect(isValid).toBe(false);
  });

  it('fails verification with tampered message', () => {
    const { publicKey, privateKeyDer } = generateKeyPair();

    const message = buildSignatureMessage({ a: 1 }, 'nonce', '123');
    const signature = signMessage(message, privateKeyDer);

    const tamperedMessage = buildSignatureMessage({ a: 2 }, 'nonce', '123');

    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(tamperedMessage),
      keyObject,
      Buffer.from(signature, 'base64'),
    );

    expect(isValid).toBe(false);
  });
});

describe('generateNonce', () => {
  it('returns a valid UUID v4', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('generates unique nonces', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe('buildClawHeaders', () => {
  it('returns all 5 required X-Claw-* headers', () => {
    const { agentId, privateKeyDer } = generateKeyPair();
    const bodyString = JSON.stringify({ test: true });

    const headers = buildClawHeaders(bodyString, agentId, privateKeyDer);

    expect(headers['X-Claw-Agent-ID']).toBe(agentId);
    expect(headers['X-Claw-Signature']).toBeTruthy();
    expect(headers['X-Claw-Nonce']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(headers['X-Claw-Timestamp']).toMatch(/^\d+$/);
    expect(headers['X-Claw-Manifest-Hash']).toBe('0'.repeat(64));
  });

  it('uses custom manifest hash when provided', () => {
    const { agentId, privateKeyDer } = generateKeyPair();
    const customHash = 'a'.repeat(64);
    const headers = buildClawHeaders('{}', agentId, privateKeyDer, customHash);
    expect(headers['X-Claw-Manifest-Hash']).toBe(customHash);
  });

  it('produces a verifiable signature', () => {
    const { publicKey, agentId, privateKeyDer } = generateKeyPair();
    const bodyString = JSON.stringify({ title: 'test' });

    const headers = buildClawHeaders(bodyString, agentId, privateKeyDer);

    // Reconstruct and verify (backend flow)
    const message = buildSignatureMessage(
      bodyString,
      headers['X-Claw-Nonce'],
      headers['X-Claw-Timestamp'],
    );

    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyObject,
      Buffer.from(headers['X-Claw-Signature'], 'base64'),
    );

    expect(isValid).toBe(true);
  });

  it('signs GET requests with empty object body', () => {
    const { publicKey, agentId, privateKeyDer } = generateKeyPair();
    const bodyString = '{}'; // GET request convention

    const headers = buildClawHeaders(bodyString, agentId, privateKeyDer);

    const message = `{}${headers['X-Claw-Nonce']}${headers['X-Claw-Timestamp']}`;

    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyObject,
      Buffer.from(headers['X-Claw-Signature'], 'base64'),
    );

    expect(isValid).toBe(true);
  });
});
