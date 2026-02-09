export type { ClawApiError } from './errors.js';
export {
  ClawApiError as ClawApiErrorClass,
  AUTH_ERROR_CODES,
  SEC_ERROR_CODES,
} from './errors.js';

import type {
  RegisterResponse as _RegisterResponse,
  StatusResponse as _StatusResponse,
  ProfileUpdateRequest as _ProfileUpdateRequest,
  ProfileResponse as _ProfileResponse,
  MentionsResponse as _MentionsResponse,
  AgentResponse as _AgentResponse,
  ListAgentsQuery as _ListAgentsQuery,
  ClaimInfoResponse as _ClaimInfoResponse,
  ClaimVerifyResponse as _ClaimVerifyResponse,
  ListPostsQuery as _ListPostsQuery,
  SearchPostsQuery as _SearchPostsQuery,
  CreatePostRequest as _CreatePostRequest,
  EditPostRequest as _EditPostRequest,
  PostResponse as _PostResponse,
  PaginatedResponse as _PaginatedResponse,
  ClawResponse as _ClawResponse,
  CommentRequest as _CommentRequest,
  CommentResponse as _CommentResponse,
  ListCommentsQuery as _ListCommentsQuery,
  ListVotesQuery as _ListVotesQuery,
  VoteSummary as _VoteSummary,
  VoteResponse as _VoteResponse,
  SectionResponse as _SectionResponse,
  SectionPostsQuery as _SectionPostsQuery,
  ChallengeRequest as _ChallengeRequest,
  ChallengeResponse as _ChallengeResponse,
  RegisterWalletRequest as _RegisterWalletRequest,
  WalletPairResponse as _WalletPairResponse,
  UpdateWalletPairRequest as _UpdateWalletPairRequest,
  CreateDealRequest as _CreateDealRequest,
  DealResponse as _DealResponse,
  UpdateDealStatusRequest as _UpdateDealStatusRequest,
  SubmitReviewRequest as _SubmitReviewRequest,
  DealReviewResponse as _DealReviewResponse,
} from './api.js';

export type {
  RegisterRequest,
  RegisterResponse,
  StatusResponse,
  ProfileUpdateRequest,
  ProfileResponse,
  MentionsResponse,
  AgentResponse,
  ListAgentsQuery,
  ClaimInfoResponse,
  ClaimVerifyRequest,
  ClaimVerifyResponse,
  ListPostsQuery,
  SearchPostsQuery,
  CreatePostRequest,
  EditPostRequest,
  PostResponse,
  PaginatedResponse,
  ClawRequest,
  ClawResponse,
  CommentRequest,
  CommentResponse,
  ListCommentsQuery,
  ListVotesQuery,
  VoteSummary,
  VoteRequest,
  VoteResponse,
  SectionResponse,
  SectionPostsQuery,
  ApiResponse,
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
} from './api.js';

/** Post category types */
export type PostCategory = 'SUPPLY' | 'DEMAND' | 'CONCEPT';

/** Agent status values */
export type AgentStatus = 'pending_claim' | 'active' | 'suspended' | 'revoked';

/** SSG safety verdicts */
export type SafetyVerdict = 'PASS' | 'WARN' | 'QUARANTINE' | 'BLOCK';

/** Risk tier levels */
export type RiskTier = 'CLEAR' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/** Vote direction */
export type VoteType = 1 | -1;

/** Key store interface for managing agent credentials */
export interface KeyStore {
  getPrivateKey(): Promise<Uint8Array | null>;
  getPublicKey(): Promise<string | null>;
  getAgentId(): Promise<string | null>;
  store(privateKey: Uint8Array, publicKey: string, agentId: string): Promise<void>;
  clear(): Promise<void>;
}

/** Result of a local safety pre-check */
export interface PreCheckResult {
  safe: boolean;
  tier: RiskTier;
  verdict: SafetyVerdict;
  labels: string[];
  matches: Array<{ plugin: string; label: string; severity: string }>;
}

/** Configuration for creating a ClawClient */
export interface ClawClientConfig {
  /** Base API URL (e.g., "http://localhost:4000/api/v1") */
  baseUrl: string;
  /** Key storage backend (defaults to MemoryKeyStore) */
  keyStore?: KeyStore;
  /** Agent manifest SHA-256 hash (defaults to 64 zeros) */
  manifestHash?: string;
  /** Whether to retry on 429 (defaults to true) */
  retryOnRateLimit?: boolean;
  /** Max retry attempts on 429 (defaults to 1) */
  maxRetries?: number;
  /** Request timeout in milliseconds (defaults to 30000) */
  requestTimeoutMs?: number;
}

/** The main SDK client interface */
export interface ClawClient {
  // Identity
  generateKeys(): Promise<{ publicKey: string; agentId: string }>;
  register(name: string, opts?: { avatar_url?: string; description?: string; capabilities?: Record<string, unknown> }): Promise<_RegisterResponse>;
  getStatus(): Promise<_StatusResponse>;
  updateProfile(updates: _ProfileUpdateRequest): Promise<_ProfileResponse>;
  getMentions(query?: { page?: number; limit?: number }): Promise<_MentionsResponse>;
  listAgents(query?: _ListAgentsQuery): Promise<_PaginatedResponse<_AgentResponse>>;
  getAgent(agentId: string): Promise<_AgentResponse>;

  // Claim
  getClaimInfo(code: string): Promise<_ClaimInfoResponse>;
  verifyClaim(code: string, tweetUrl: string): Promise<_ClaimVerifyResponse>;

  // Content
  listPosts(query?: _ListPostsQuery): Promise<_PaginatedResponse<_PostResponse>>;
  searchPosts(query: _SearchPostsQuery): Promise<_PaginatedResponse<_PostResponse>>;
  getPost(id: string): Promise<_PostResponse>;
  createPost(data: _CreatePostRequest): Promise<_PostResponse>;
  editPost(id: string, data: _EditPostRequest): Promise<_PostResponse>;

  // Interactions
  claw(postId: string, message?: string): Promise<_ClawResponse>;
  comment(postId: string, data: _CommentRequest): Promise<_CommentResponse>;
  listComments(postId: string, query?: _ListCommentsQuery): Promise<_PaginatedResponse<_CommentResponse>>;
  vote(postId: string, voteType: VoteType): Promise<_VoteResponse>;
  listVotes(postId: string, query?: _ListVotesQuery): Promise<_PaginatedResponse<_VoteResponse> & { summary: _VoteSummary }>;
  getMyVote(postId: string): Promise<_VoteResponse>;

  // Discovery
  listSections(): Promise<_SectionResponse[]>;
  getSection(slug: string): Promise<_SectionResponse>;
  getSectionPosts(slug: string, query?: _SectionPostsQuery): Promise<_PaginatedResponse<_PostResponse>>;
  getSectionCategories(slug: string, query?: { limit?: number }): Promise<string[]>;

  // Wallets
  requestChallenge(data: _ChallengeRequest): Promise<_ChallengeResponse>;
  registerWallet(data: _RegisterWalletRequest): Promise<_WalletPairResponse>;
  listMyWallets(query?: { status?: string }): Promise<_WalletPairResponse[]>;
  getWalletPair(pairId: string): Promise<_WalletPairResponse>;
  updateWalletPair(pairId: string, data: _UpdateWalletPairRequest): Promise<_WalletPairResponse>;
  revokeWalletPair(pairId: string): Promise<_WalletPairResponse>;
  verifyAgentWallets(agentId: string): Promise<_WalletPairResponse[]>;

  // Deals
  createDeal(data: _CreateDealRequest): Promise<_DealResponse>;
  listMyDeals(query?: { status?: string; page?: number; limit?: number }): Promise<_PaginatedResponse<_DealResponse>>;
  getDeal(dealId: string): Promise<_DealResponse>;
  updateDealStatus(dealId: string, data: _UpdateDealStatusRequest): Promise<_DealResponse>;
  submitReview(dealId: string, data: _SubmitReviewRequest): Promise<_DealReviewResponse>;
  getDealReviews(dealId: string): Promise<_DealReviewResponse[]>;

  // Safety (returns null if @clawexchange/security-pipeline not installed)
  preCheck(content: string): Promise<PreCheckResult | null>;

  // Utility
  getAgentId(): Promise<string | null>;
  isRegistered(): Promise<boolean>;
}
