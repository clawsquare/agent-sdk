import { describe, it, expect } from 'vitest';
import { deriveEvmAddress, signEvmMessage } from './evm.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';

// Well-known Hardhat test private key #0
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
// Its corresponding address (Hardhat account #0)
const EXPECTED_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

describe('deriveEvmAddress', () => {
  it('derives correct address from private key with 0x prefix', () => {
    const address = deriveEvmAddress(TEST_PRIVATE_KEY);
    expect(address.toLowerCase()).toBe(EXPECTED_ADDRESS.toLowerCase());
  });

  it('derives correct address from private key without 0x prefix', () => {
    const address = deriveEvmAddress(TEST_PRIVATE_KEY.slice(2));
    expect(address.toLowerCase()).toBe(EXPECTED_ADDRESS.toLowerCase());
  });

  it('returns a valid 0x-prefixed 42-char hex address', () => {
    const address = deriveEvmAddress(TEST_PRIVATE_KEY);
    expect(address).toMatch(/^0x[0-9a-f]{40}$/);
  });
});

describe('signEvmMessage', () => {
  it('produces a 0x-prefixed 130-char hex signature (65 bytes)', () => {
    const sig = signEvmMessage('hello world', TEST_PRIVATE_KEY);
    expect(sig).toMatch(/^0x[0-9a-f]{130}$/);
  });

  it('signature can be verified by recovering the correct address', () => {
    const message = 'ClawSquare wallet verification: test-nonce for agent abc';
    const sig = signEvmMessage(message, TEST_PRIVATE_KEY);

    // Verify: replicate backend logic
    const prefix = `\x19Ethereum Signed Message:\n${message.length}`;
    const prefixedMessage = Buffer.concat([
      Buffer.from(prefix),
      Buffer.from(message),
    ]);
    const hash = keccak_256(prefixedMessage);

    // Parse EVM signature: r[32] + s[32] + v[1]
    const sigHex = sig.slice(2);
    const sigBytes = Uint8Array.from(Buffer.from(sigHex, 'hex'));
    let v = sigBytes[64];
    if (v >= 27) v -= 27;

    // Rearrange to noble 'recovered' format: [recovery(1), r(32), s(32)]
    const recovered = new Uint8Array(65);
    recovered[0] = v;
    recovered.set(sigBytes.subarray(0, 64), 1);

    // Recover compressed pubkey, then convert to uncompressed
    const pubCompressed = secp256k1.recoverPublicKey(recovered, hash);
    const point = secp256k1.Point.fromBytes(pubCompressed);
    const uncompressed = point.toBytes(false);

    const pubkeyHash = keccak_256(uncompressed.subarray(1));
    const addressBytes = pubkeyHash.slice(-20);
    const recoveredAddress = '0x' + Buffer.from(addressBytes).toString('hex');

    expect(recoveredAddress.toLowerCase()).toBe(EXPECTED_ADDRESS.toLowerCase());
  });

  it('different messages produce different signatures', () => {
    const sig1 = signEvmMessage('message one', TEST_PRIVATE_KEY);
    const sig2 = signEvmMessage('message two', TEST_PRIVATE_KEY);
    expect(sig1).not.toBe(sig2);
  });
});
