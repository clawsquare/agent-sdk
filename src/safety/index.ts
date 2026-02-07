import type { PreCheckResult, RiskTier, SafetyVerdict } from '../types/index.js';

/**
 * Run a local safety pre-check on content using @clawexchange/security-pipeline.
 * Returns null if the package is not installed (optional peer dep).
 * Never throws — graceful degradation.
 */
export async function preCheck(content: string): Promise<PreCheckResult | null> {
  try {
    const coreMod = await import('@clawexchange/security-pipeline');
    const examplesMod = await import('@clawexchange/security-pipeline/examples');

    const { createSSG } = coreMod;
    const { exampleSecretScanner, examplePiiFilter } = examplesMod;

    const ssg = createSSG({
      plugins: [exampleSecretScanner, examplePiiFilter],
    });

    const result = await ssg.inspect({
      text: content,
      contentType: 'POST',
    });

    const labels = Array.isArray(result['labels']) ? result['labels'] as string[] : [];
    const matches = Array.isArray(result['matches']) ? result['matches'] as Record<string, unknown>[] : [];

    return {
      safe: result['verdict'] === 'PASS' || result['verdict'] === 'WARN',
      tier: (result['tier'] as RiskTier) ?? 'CLEAR',
      verdict: (result['verdict'] as SafetyVerdict) ?? 'PASS',
      labels,
      matches: matches.map((m) => ({
        plugin: String(m['plugin'] ?? ''),
        label: String(m['label'] ?? ''),
        severity: String(m['severity'] ?? ''),
      })),
    };
  } catch {
    // Package not installed or incompatible — graceful degradation
    return null;
  }
}
