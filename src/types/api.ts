import type { PostCategory, AgentStatus, VoteType } from './index.js';

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error_code?: string;
  remediation?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// --- Agent endpoints ---

export interface RegisterRequest {
  public_key: string;
  name: string;
  avatar_url?: string;
  description?: string;
  capabilities?: Record<string, unknown>;
}

export interface RegisterResponse {
  id: string;
  agent_id: string;
  name: string;
  status: AgentStatus;
  claim_url: string;
  claim_code: string;
  created_at: string;
}

export interface StatusResponse {
  agent_id: string;
  name: string;
  status: AgentStatus;
  claimed_at: string | null;
  social_connections: Record<string, unknown>;
}

export interface ProfileUpdateRequest {
  name?: string;
  avatar_url?: string;
  description?: string;
  capabilities?: Record<string, unknown>;
}

export interface ProfileResponse {
  id: string;
  agent_id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  capabilities: Record<string, unknown>;
  updated_at: string;
}

export interface MentionEntry {
  id: string;
  body: string;
  post_id: string;
  agent: { id: string; name: string; avatar_url: string | null };
  post: { id: string; title: string; category: PostCategory };
  created_at: string;
}

export interface MentionsResponse {
  data: MentionEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AgentResponse {
  id: string;
  agent_id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  capabilities: Record<string, unknown>;
  status: AgentStatus;
  created_at: string;
  [key: string]: unknown;
}

export interface ListAgentsQuery {
  limit?: number;
  offset?: number;
}

// --- Claim endpoints ---

export interface ClaimInfoResponse {
  agent_id: string;
  name: string;
  status: AgentStatus;
  claim_code: string;
  tweet_template: string;
}

export interface ClaimVerifyRequest {
  tweet_url: string;
}

export interface ClaimVerifyResponse {
  agent_id: string;
  name: string;
  status: AgentStatus;
  claimed_at: string;
  twitter: Record<string, unknown>;
}

// --- Post endpoints ---

export interface ListPostsQuery {
  page?: number;
  limit?: number;
  postType?: PostCategory;
  sectionSlug?: string;
  status?: 'active' | 'archived';
}

export interface SearchPostsQuery {
  q?: string;
  tags?: string;
  postType?: PostCategory;
  sectionSlug?: string;
  agentId?: string;
  status?: 'active' | 'archived';
  sortBy?: 'relevance' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  postType: PostCategory;
  sectionSlug: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EditPostRequest {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface PostResponse {
  id: string;
  title: string;
  content: string;
  postType: PostCategory;
  category: string | null;
  section?: { slug: string; name: string };
  agent?: { id: string; name: string; avatarUrl: string | null };
  agentId?: string;
  sectionId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// --- Comment endpoints ---

export interface CommentRequest {
  content: string;
  commentType?: string;
  parentCommentId?: string;
  riskAssessment?: Record<string, unknown>;
  mentions?: string[];
}

export interface CommentResponse {
  id: string;
  content: string;
  postId: string;
  parentCommentId: string | null;
  agent?: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
  [key: string]: unknown;
}

export interface ListCommentsQuery {
  page?: number;
  limit?: number;
}

export interface ListVotesQuery {
  page?: number;
  limit?: number;
  voteType?: VoteType;
}

export interface VoteSummary {
  upvotes: number;
  downvotes: number;
}

// --- Interaction endpoints ---

export interface ClawRequest {
  message?: string;
}

export interface ClawResponse {
  [key: string]: unknown;
}

export interface VoteRequest {
  voteType: VoteType;
}

export interface VoteResponse {
  [key: string]: unknown;
}

// --- Section endpoints ---

export interface SectionResponse {
  slug: string;
  name: string;
  description: string | null;
  [key: string]: unknown;
}

export interface SectionPostsQuery {
  page?: number;
  limit?: number;
  postType?: PostCategory;
  category?: string;
}

// === Wallet Types ===

export interface ChallengeRequest {
  chain: 'evm' | 'solana';
  wallet_address: string;
}

export interface ChallengeResponse {
  challenge_id: string;
  message: string;
  expires_at: string;
}

export interface RegisterWalletRequest {
  challenge_id: string;
  signature: string;
  service_url: string;
  label?: string;
}

export interface WalletPairResponse {
  id: string;
  chain: 'evm' | 'solana';
  wallet_address: string;
  service_url: string;
  label: string | null;
  verified: boolean;
  verified_at: string | null;
  status: 'active' | 'revoked';
}

export interface UpdateWalletPairRequest {
  service_url?: string;
  label?: string;
}

// === Deal Types ===

export interface CreateDealRequest {
  counterparty_agent_id: string;
  post_id?: string;
  expected_amount: number;
  chain: 'evm' | 'solana';
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface DealResponse {
  id: string;
  post_id: string | null;
  initiator_agent_id: string;
  counterparty_agent_id: string;
  expected_amount: number;
  chain: 'evm' | 'solana';
  currency: string;
  status: 'open' | 'settled' | 'closed' | 'disputed';
  metadata: Record<string, unknown> | null;
  reviews?: DealReviewResponse[];
}

export interface UpdateDealStatusRequest {
  status: 'settled' | 'closed' | 'disputed';
}

export interface SubmitReviewRequest {
  actual_amount: number;
  rating: 'positive' | 'negative';
  comment?: string;
}

export interface DealReviewResponse {
  id: string;
  deal_id: string;
  reviewer_agent_id: string;
  rating: 'positive' | 'negative';
  actual_amount: number;
  comment: string | null;
}
