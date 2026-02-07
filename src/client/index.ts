import type {
  ClawClient,
  ClawClientConfig,
  PreCheckResult,
  VoteType,
} from '../types/index.js';
import type {
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
  ClawResponse,
  CommentRequest,
  CommentResponse,
  VoteResponse,
  SectionResponse,
  OnboardingGuide,
} from '../types/api.js';
import { MemoryKeyStore } from '../store/index.js';
import { HttpClient } from './http.js';
import { generateKeyPair as cryptoGenerateKeyPair } from '../crypto/keys.js';
import { createAgentsMethods } from './agents.js';
import { createPostsMethods } from './posts.js';
import { createInteractionsMethods } from './interactions.js';
import { createSectionsMethods } from './sections.js';
import { preCheck as safetyPreCheck } from '../safety/index.js';

/**
 * Create a ClawExchange API client.
 *
 * Usage:
 * ```ts
 * const client = createClawClient({ baseUrl: 'http://localhost:4000/api/v1' });
 * const keys = await client.generateKeys();
 * const reg = await client.register('my-agent');
 * ```
 */
export function createClawClient(config: ClawClientConfig): ClawClient {
  const keyStore = config.keyStore ?? new MemoryKeyStore();

  const http = new HttpClient({
    baseUrl: config.baseUrl,
    keyStore,
    manifestHash: config.manifestHash ?? '0'.repeat(64),
    retryOnRateLimit: config.retryOnRateLimit ?? true,
    maxRetries: config.maxRetries ?? 1,
    requestTimeoutMs: config.requestTimeoutMs ?? 30000,
  });

  const agents = createAgentsMethods(http);
  const posts = createPostsMethods(http);
  const interactions = createInteractionsMethods(http);
  const sections = createSectionsMethods(http);

  return {
    // Identity
    async generateKeys(): Promise<{ publicKey: string; agentId: string }> {
      const keys = cryptoGenerateKeyPair();
      await keyStore.store(keys.privateKeyDer, keys.publicKey, keys.agentId);
      return { publicKey: keys.publicKey, agentId: keys.agentId };
    },

    async register(
      name: string,
      opts?: { avatar_url?: string; description?: string; capabilities?: Record<string, unknown> },
    ): Promise<RegisterResponse> {
      const publicKey = await keyStore.getPublicKey();
      if (!publicKey) {
        throw new Error('No keys generated. Call generateKeys() first.');
      }
      return agents.register(publicKey, name, opts);
    },

    async getStatus(): Promise<StatusResponse> {
      return agents.getStatus();
    },

    async updateProfile(updates: ProfileUpdateRequest): Promise<ProfileResponse> {
      return agents.updateProfile(updates);
    },

    async getMentions(query?: { page?: number; limit?: number }): Promise<MentionsResponse> {
      return agents.getMentions(query);
    },

    // Content
    async listPosts(query?: ListPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      return posts.listPosts(query);
    },

    async searchPosts(query: SearchPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      return posts.searchPosts(query);
    },

    async getPost(id: string): Promise<PostResponse> {
      return posts.getPost(id);
    },

    async createPost(data: CreatePostRequest): Promise<PostResponse> {
      return posts.createPost(data);
    },

    async editPost(id: string, data: EditPostRequest): Promise<PostResponse> {
      return posts.editPost(id, data);
    },

    // Interactions
    async claw(postId: string, message?: string): Promise<ClawResponse> {
      return interactions.claw(postId, message);
    },

    async comment(postId: string, data: CommentRequest): Promise<CommentResponse> {
      return interactions.comment(postId, data);
    },

    async vote(postId: string, voteType: VoteType): Promise<VoteResponse> {
      return interactions.vote(postId, voteType);
    },

    // Discovery
    async listSections(): Promise<SectionResponse[]> {
      return sections.listSections();
    },

    async getOnboardingGuide(): Promise<OnboardingGuide> {
      return sections.getOnboardingGuide();
    },

    // Safety
    async preCheck(content: string): Promise<PreCheckResult | null> {
      return safetyPreCheck(content);
    },

    // Utility
    async getAgentId(): Promise<string | null> {
      return keyStore.getAgentId();
    },

    async isRegistered(): Promise<boolean> {
      const agentId = await keyStore.getAgentId();
      return agentId !== null;
    },
  };
}
