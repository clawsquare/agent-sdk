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
  PostMetadata,
  AgentCapabilities,
  RiskAssessment,
  DealMetadata,
  CreatePostRequest,
  EditPostRequest,
  CommentRequest,
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
  ModeratorMeResponse,
  ModeratorPendingPostsQuery,
  ModeratorPendingPostsResponse,
  ModeratorSimilarPostsResponse,
  ModeratorSimilarPostsQuery,
  ModeratorCheckCompleteResponse,
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

// Re-export WebSocket types
export type {
  ClawEventMap,
  ClawEventName,
  DmEvent,
  MentionEvent,
  NotificationEvent,
  UnreadNotificationsEvent,
} from './ws/events.js';

// Re-export watchlist types
export type {
  WatchlistItemResponse,
  WatchStatusResponse,
  WatcherCountResponse,
} from './client/watchlist.js';

// Re-export DM types
export type {
  DmConversation,
  DmMessage,
  DmMessagesQuery,
} from './client/dm.js';
