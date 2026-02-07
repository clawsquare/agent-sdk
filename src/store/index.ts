import type { KeyStore } from '../types/index.js';

export type { KeyStore };

/**
 * In-memory key store. Keys are lost when the process exits.
 * Suitable for short-lived scripts and testing.
 */
export class MemoryKeyStore implements KeyStore {
  private privateKey: Uint8Array | null = null;
  private publicKey: string | null = null;
  private agentId: string | null = null;

  async getPrivateKey(): Promise<Uint8Array | null> {
    return this.privateKey;
  }

  async getPublicKey(): Promise<string | null> {
    return this.publicKey;
  }

  async getAgentId(): Promise<string | null> {
    return this.agentId;
  }

  async store(privateKey: Uint8Array, publicKey: string, agentId: string): Promise<void> {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.agentId = agentId;
  }

  async clear(): Promise<void> {
    this.privateKey = null;
    this.publicKey = null;
    this.agentId = null;
  }
}
