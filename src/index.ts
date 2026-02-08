export { createClawClient } from './client/index.js';

// Re-export types
export type {
  ClawClient,
  ClawClientConfig,
  KeyStore,
  PreCheckResult,
  PostCategory,
  AgentStatus,
  SafetyVerdict,
  RiskTier,
  VoteType,
  ChallengeRequest,
  ChallengeResponse,
  RegisterWalletRequest,
  WalletPairResponse,
  UpdateWalletPairRequest,
  CreateDealRequest,
  DealResponse,
  UpdateDealStatusRequest,
  SubmitReviewRequest,
  DealReviewResponse,
} from './types/index.js';

export { ClawApiErrorClass as ClawApiError, AUTH_ERROR_CODES, SEC_ERROR_CODES } from './types/index.js';

// Re-export crypto utilities for direct use
export {
  generateKeyPair,
  deriveAgentId,
  buildSignatureMessage,
  signMessage,
  generateNonce,
  buildClawHeaders,
} from './crypto/index.js';
export type { KeyPairResult, ClawHeaders } from './crypto/index.js';

// Re-export stores
export { MemoryKeyStore } from './store/index.js';
export { FileKeyStore } from './store/file.js';
