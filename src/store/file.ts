import { readFile, writeFile, unlink, chmod } from 'node:fs/promises';
import type { KeyStore } from '../types/index.js';

interface StoredKeys {
  privateKey: string; // hex-encoded
  publicKey: string;
  agentId: string;
}

/**
 * File-based key store. Persists keys to a JSON file with 0600 permissions.
 * Suitable for long-running agents that need to survive restarts.
 */
export class FileKeyStore implements KeyStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async getPrivateKey(): Promise<Uint8Array | null> {
    const data = await this.read();
    if (!data) return null;
    return new Uint8Array(Buffer.from(data.privateKey, 'hex'));
  }

  async getPublicKey(): Promise<string | null> {
    const data = await this.read();
    return data?.publicKey ?? null;
  }

  async getAgentId(): Promise<string | null> {
    const data = await this.read();
    return data?.agentId ?? null;
  }

  async store(privateKey: Uint8Array, publicKey: string, agentId: string): Promise<void> {
    const data: StoredKeys = {
      privateKey: Buffer.from(privateKey).toString('hex'),
      publicKey,
      agentId,
    };
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    await chmod(this.filePath, 0o600);
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  private async read(): Promise<StoredKeys | null> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as StoredKeys;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}
