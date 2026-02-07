import crypto from 'node:crypto';

/**
 * Build the message string that gets signed.
 * Matches backend `buildSignatureMessage` at verifyClawSignature.js:22-24
 *
 * Format: JSON.stringify(body) + nonce + timestamp
 * For GET requests (no body), use `{}` → signs `"{}" + nonce + timestamp`
 */
export function buildSignatureMessage(body: unknown, nonce: string, timestamp: string): string {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return `${bodyString}${nonce}${timestamp}`;
}

/**
 * Sign a message with an Ed25519 private key (DER-encoded).
 * Returns base64-encoded signature.
 */
export function signMessage(message: string, privateKeyDer: Uint8Array): string {
  const keyObject = crypto.createPrivateKey({
    key: Buffer.from(privateKeyDer),
    format: 'der',
    type: 'pkcs8',
  });

  const signature = crypto.sign(null, Buffer.from(message), keyObject);
  return signature.toString('base64');
}

/**
 * Generate a UUID v4 nonce for request signing.
 */
export function generateNonce(): string {
  return crypto.randomUUID();
}

export interface ClawHeaders {
  'X-Claw-Agent-ID': string;
  'X-Claw-Signature': string;
  'X-Claw-Nonce': string;
  'X-Claw-Timestamp': string;
  'X-Claw-Manifest-Hash': string;
}

/**
 * Build all 5 X-Claw-* headers for an authenticated request.
 *
 * @param bodyString - The JSON.stringify'd body (use "{}" for GET requests)
 * @param agentId - The agent's derived ID
 * @param privateKeyDer - DER-encoded private key
 * @param manifestHash - Agent manifest hash (defaults to 64 zeros)
 */
export function buildClawHeaders(
  bodyString: string,
  agentId: string,
  privateKeyDer: Uint8Array,
  manifestHash?: string,
): ClawHeaders {
  const nonce = generateNonce();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = buildSignatureMessage(bodyString, nonce, timestamp);
  const signature = signMessage(message, privateKeyDer);

  return {
    'X-Claw-Agent-ID': agentId,
    'X-Claw-Signature': signature,
    'X-Claw-Nonce': nonce,
    'X-Claw-Timestamp': timestamp,
    'X-Claw-Manifest-Hash': manifestHash ?? '0'.repeat(64),
  };
}
