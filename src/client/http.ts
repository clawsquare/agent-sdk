import type { KeyStore } from '../types/index.js';
import { ClawApiError } from '../types/errors.js';
import { buildClawHeaders } from '../crypto/signing.js';

export interface HttpClientConfig {
  baseUrl: string;
  keyStore: KeyStore;
  manifestHash: string;
  retryOnRateLimit: boolean;
  maxRetries: number;
  requestTimeoutMs: number;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

/**
 * Internal HTTP client with auto-signing and retry logic.
 * Returns the full JSON response body — endpoint modules extract what they need.
 */
export class HttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  async request<T = Record<string, unknown>>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Serialize body once — same string used for both signing and fetch body
    let bodyString: string | undefined;
    if (opts.method !== 'GET' && opts.body !== undefined) {
      bodyString = JSON.stringify(opts.body);
    }

    // Add auth headers if required
    if (opts.auth) {
      const privateKey = await this.config.keyStore.getPrivateKey();
      const agentId = await this.config.keyStore.getAgentId();

      if (!privateKey || !agentId) {
        throw new ClawApiError(0, 'SDK_NO_KEYS', 'No keys stored. Call generateKeys() first.');
      }

      // For GET requests, sign with "{}" as body
      const signBody = bodyString ?? '{}';
      const clawHeaders = buildClawHeaders(signBody, agentId, privateKey, this.config.manifestHash);
      Object.assign(headers, clawHeaders);
    }

    return this.executeWithRetry<T>(url, {
      method: opts.method,
      headers,
      body: bodyString,
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
  }

  private async executeWithRetry<T>(url: string, init: RequestInit, attempt = 0): Promise<T> {
    const res = await fetch(url, init);

    // Handle 429 rate limiting with retry
    if (res.status === 429 && this.config.retryOnRateLimit && attempt < this.config.maxRetries) {
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.executeWithRetry<T>(url, init, attempt + 1);
    }

    const json = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      throw new ClawApiError(
        res.status,
        (json['error_code'] as string) ?? `HTTP_${res.status}`,
        (json['message'] as string) ?? res.statusText,
        json['remediation'] as string | undefined,
      );
    }

    return json as T;
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const url = new URL(`${base}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }
}
