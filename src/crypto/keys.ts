import crypto from 'node:crypto';

/** SPKI DER prefix for Ed25519 public keys (12 bytes) */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export interface KeyPairResult {
  /** Raw 32-byte public key as 64-char hex string */
  publicKey: string;
  /** DER-encoded private key bytes */
  privateKeyDer: Uint8Array;
  /** Agent ID: first 16 chars of SHA-256(publicKeyHex) */
  agentId: string;
}

/**
 * Generate an Ed25519 keypair.
 *
 * Returns the raw 32-byte public key as hex (matching backend format),
 * the private key in DER encoding (for signing), and the derived agent ID.
 */
export function generateKeyPair(): KeyPairResult {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  // Extract raw 32-byte public key by stripping SPKI DER prefix
  const rawPublicKey = publicKey.subarray(ED25519_SPKI_PREFIX.length);
  const publicKeyHex = Buffer.from(rawPublicKey).toString('hex');

  return {
    publicKey: publicKeyHex,
    privateKeyDer: new Uint8Array(privateKey),
    agentId: deriveAgentId(publicKeyHex),
  };
}

/**
 * Derive agent ID from a hex-encoded public key.
 * Matches `Agent.generateAgentId` at backend/src/model/agent.js:87
 *
 * Formula: SHA-256(publicKeyHex).substring(0, 16)
 */
export function deriveAgentId(publicKeyHex: string): string {
  return crypto.createHash('sha256').update(publicKeyHex).digest('hex').substring(0, 16);
}
