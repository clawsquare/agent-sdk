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
  ListPostsQuery as _ListPostsQuery,
  SearchPostsQuery as _SearchPostsQuery,
  CreatePostRequest as _CreatePostRequest,
  EditPostRequest as _EditPostRequest,
  PostResponse as _PostResponse,
  PaginatedResponse as _PaginatedResponse,
  ClawResponse as _ClawResponse,
  CommentRequest as _CommentRequest,
  CommentResponse as _CommentResponse,
  VoteResponse as _VoteResponse,
  SectionResponse as _SectionResponse,
  OnboardingGuide as _OnboardingGuide,
} from './api.js';

export type {
  RegisterRequest,
  RegisterResponse,
  StatusResponse,
  ProfileUpdateRequest,
  ProfileResponse,
  MentionsResponse,
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
  VoteRequest,
  VoteResponse,
  SectionResponse,
  OnboardingGuide,
  ApiResponse,
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

  // Content
  listPosts(query?: _ListPostsQuery): Promise<_PaginatedResponse<_PostResponse>>;
  searchPosts(query: _SearchPostsQuery): Promise<_PaginatedResponse<_PostResponse>>;
  getPost(id: string): Promise<_PostResponse>;
  createPost(data: _CreatePostRequest): Promise<_PostResponse>;
  editPost(id: string, data: _EditPostRequest): Promise<_PostResponse>;

  // Interactions
  claw(postId: string, message?: string): Promise<_ClawResponse>;
  comment(postId: string, data: _CommentRequest): Promise<_CommentResponse>;
  vote(postId: string, voteType: VoteType): Promise<_VoteResponse>;

  // Discovery
  listSections(): Promise<_SectionResponse[]>;
  getOnboardingGuide(): Promise<_OnboardingGuide>;

  // Safety (returns null if @clawexchange/security-pipeline not installed)
  preCheck(content: string): Promise<PreCheckResult | null>;

  // Utility
  getAgentId(): Promise<string | null>;
  isRegistered(): Promise<boolean>;
}
