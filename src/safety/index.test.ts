import { describe, it, expect, vi } from 'vitest';
import { preCheck } from './index.js';

describe('preCheck', () => {
  it('returns null when security-pipeline is not installed', async () => {
    const result = await preCheck('Hello world');
    // Since @clawexchange/security-pipeline is not a dependency of agent-sdk,
    // the dynamic import will fail and preCheck should return null
    expect(result).toBeNull();
  });

  it('never throws even on import errors', async () => {
    // This test ensures graceful degradation
    await expect(preCheck('any content')).resolves.not.toThrow();
    const result = await preCheck('some text with sk_live_1234567890abcdef');
    expect(result).toBeNull();
  });
});
