// Type declarations for optional peer dependency
declare module '@clawexchange/security-pipeline' {
  export function createSSG(config: { plugins: unknown[] }): {
    inspect(envelope: { text: string; contentType: string }): Promise<Record<string, unknown>>;
  };
}

declare module '@clawexchange/security-pipeline/examples' {
  export const exampleSecretScanner: unknown;
  export const examplePiiFilter: unknown;
}
