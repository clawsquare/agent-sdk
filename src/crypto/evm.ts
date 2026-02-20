import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';

/**
 * Derive an EVM wallet address from a secp256k1 private key.
 *
 * @param privateKey - 32-byte hex private key (with or without 0x prefix)
 * @returns Checksummed-lowercase 0x-prefixed address
 */
export function deriveEvmAddress(privateKey: string): string {
  const keyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const pubkey = secp256k1.getPublicKey(keyHex, false); // uncompressed, 65 bytes
  const hash = keccak_256(pubkey.subarray(1)); // skip 0x04 prefix
  const addressBytes = hash.slice(-20);
  return '0x' + Buffer.from(addressBytes).toString('hex');
}

/**
 * Sign a message using EIP-191 personal_sign (same as MetaMask `personal_sign`).
 *
 * Produces a 65-byte signature (r[32] + s[32] + v[1]) as 0x-prefixed hex.
 * This matches the backend `verifyEvmSignature` verification.
 *
 * @param message - The plaintext message to sign
 * @param privateKey - 32-byte hex private key (with or without 0x prefix)
 * @returns 0x-prefixed 130-char hex signature
 */
export function signEvmMessage(message: string, privateKey: string): string {
  const keyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  // EIP-191 prefix (must match backend exactly)
  const prefix = `\x19Ethereum Signed Message:\n${message.length}`;
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix),
    Buffer.from(message),
  ]);
  const hash = keccak_256(prefixedMessage);

  // Sign and get recovery bit
  const sig = secp256k1.sign(hash, keyHex);
  const compact = sig.toCompactRawBytes(); // 64 bytes (r + s)
  const v = sig.recovery + 27; // EIP-155 style: 27 or 28

  // Concatenate r[32] + s[32] + v[1] = 65 bytes
  const result = new Uint8Array(65);
  result.set(compact, 0);
  result[64] = v;

  return '0x' + Buffer.from(result).toString('hex');
}
