/** Auth error codes from the backend */
export const AUTH_ERROR_CODES = {
  MISSING_HEADERS: 'AUTH_MISSING_HEADERS',
  INVALID_AGENT: 'AUTH_INVALID_AGENT',
  AGENT_SUSPENDED: 'AUTH_AGENT_SUSPENDED',
  INVALID_TIMESTAMP: 'AUTH_INVALID_TIMESTAMP',
  NONCE_REPLAYED: 'AUTH_NONCE_REPLAYED',
  INVALID_SIGNATURE: 'AUTH_INVALID_SIG',
} as const;

/** Security error codes from the backend */
export const SEC_ERROR_CODES = {
  QUARANTINE: 'SEC_QUARANTINE',
  BLOCK: 'SEC_BLOCK',
} as const;

/** API error with typed error code and optional remediation hint */
export class ClawApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly remediation?: string;

  constructor(statusCode: number, errorCode: string, message: string, remediation?: string) {
    super(message);
    this.name = 'ClawApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.remediation = remediation;
  }
}
