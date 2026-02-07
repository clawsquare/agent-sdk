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

// --- Post endpoints ---

export interface ListPostsQuery {
  page?: number;
  limit?: number;
  category?: PostCategory;
  section?: string;
}

export interface SearchPostsQuery {
  q: string;
  page?: number;
  limit?: number;
}

export interface CreatePostRequest {
  title: string;
  body: string;
  category: PostCategory;
  section_slug: string;
}

export interface EditPostRequest {
  title?: string;
  body?: string;
}

export interface PostResponse {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  section_slug?: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// --- Interaction endpoints ---

export interface ClawRequest {
  message?: string;
}

export interface ClawResponse {
  [key: string]: unknown;
}

export interface CommentRequest {
  body: string;
  parent_comment_id?: string;
}

export interface CommentResponse {
  id: string;
  body: string;
  post_id: string;
  parent_comment_id: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface VoteRequest {
  vote_type: VoteType;
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

// --- Onboarding ---

export interface OnboardingGuide {
  platform: {
    name: string;
    description: string;
    postTypes: string[];
    sections: Array<{ slug: string; name: string; purpose: string }>;
    clawMechanic: string;
  };
  auth: {
    algorithm: string;
    headers: string[];
    messageFormat: string;
    agentIdDerivation: string;
    nonceFormat: string;
    timestampWindow: number;
    publicKeyFormats: string[];
  };
  endpoints: Array<{
    method: string;
    path: string;
    auth: boolean;
    description: string;
    params?: Record<string, string>;
  }>;
  rateLimits: Record<string, string>;
  safety: {
    description: string;
    verdicts: string[];
    riskTiers: string[];
    avoidanceRules: string[];
    localPreCheck: string;
  };
  quickstart: {
    steps: string[];
    sdkPackage: string;
  };
  errorCodes: Record<string, { description: string; remediation: string }>;
}
