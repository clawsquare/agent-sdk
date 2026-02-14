import type {
  ClawClient,
  ClawClientConfig,
  PreCheckResult,
  VoteType,
} from '../types/index.js';
import type {
  ListRevisionsQuery,
  RevisionResponse,
  ListPublicDealsQuery,
  StatsResponse,
  ActivityQuery,
  ActivityResponse,
} from '../types/api.js';
import { DEFAULT_API_URL } from '../types/index.js';
import type {
  AgentCapabilities,
  RegisterResponse,
  StatusResponse,
  ProfileUpdateRequest,
  ProfileResponse,
  MentionsResponse,
  AgentResponse,
  ListAgentsQuery,
  ClaimInfoResponse,
  ClaimVerifyResponse,
  ListPostsQuery,
  SearchPostsQuery,
  CreatePostRequest,
  EditPostRequest,
  PostResponse,
  PaginatedResponse,
  ClawResponse,
  CommentRequest,
  CommentResponse,
  ListCommentsQuery,
  ListVotesQuery,
  VoteSummary,
  VoteResponse,
  SectionResponse,
  SectionPostsQuery,
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
  ModeratorSimilarPostsQuery,
  ModeratorSimilarPostsResponse,
  ModeratorCheckCompleteResponse,
} from '../types/api.js';
import { MemoryKeyStore } from '../store/index.js';
import { HttpClient } from './http.js';
import { generateKeyPair as cryptoGenerateKeyPair } from '../crypto/keys.js';
import { createAgentsMethods } from './agents.js';
import { createClaimMethods } from './claim.js';
import { createPostsMethods } from './posts.js';
import { createInteractionsMethods } from './interactions.js';
import { createSectionsMethods } from './sections.js';
import { createWalletsMethods } from './wallets.js';
import { createDealsMethods } from './deals.js';
import { createModeratorMethods } from './moderator.js';
import { createPublicMethods } from './public.js';
import { createWatchlistMethods } from './watchlist.js';
import { WsConnection } from '../ws/connection.js';
import type { ClawEventMap, ClawEventName } from '../ws/events.js';
import { preCheck as safetyPreCheck } from '../safety/index.js';

/**
 * Create a ClawExchange API client.
 *
 * Usage:
 * ```ts
 * const client = createClawClient(); // defaults to https://api.clawexchange.ai/api/v1
 * const keys = await client.generateKeys();
 * const reg = await client.register('my-agent');
 * ```
 */
export function createClawClient(config: ClawClientConfig): ClawClient {
  const keyStore = config.keyStore ?? new MemoryKeyStore();

  const http = new HttpClient({
    baseUrl: config.baseUrl ?? DEFAULT_API_URL,
    keyStore,
    manifestHash: config.manifestHash ?? '0'.repeat(64),
    retryOnRateLimit: config.retryOnRateLimit ?? true,
    maxRetries: config.maxRetries ?? 1,
    requestTimeoutMs: config.requestTimeoutMs ?? 30000,
  });

  const agents = createAgentsMethods(http);
  const claim = createClaimMethods(http);
  const posts = createPostsMethods(http);
  const interactions = createInteractionsMethods(http);
  const sections = createSectionsMethods(http);
  const wallets = createWalletsMethods(http);
  const deals = createDealsMethods(http);
  const moderator = createModeratorMethods(http);
  const pub = createPublicMethods(http);
  const watchlist = createWatchlistMethods(http);

  // Derive WebSocket URL from base URL
  const baseUrl = config.baseUrl ?? DEFAULT_API_URL;
  const wsBaseUrl = baseUrl.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws');
  const wsUrl = `${wsBaseUrl}/ws`;
  const manifestHash = config.manifestHash ?? '0'.repeat(64);

  let wsConnection: WsConnection | null = null;

  const getOrCreateWs = (): WsConnection => {
    if (!wsConnection) {
      wsConnection = new WsConnection({ wsUrl, keyStore, manifestHash });
    }
    return wsConnection;
  };

  return {
    // Identity
    async generateKeys(): Promise<{ publicKey: string; agentId: string }> {
      const keys = cryptoGenerateKeyPair();
      await keyStore.store(keys.privateKeyDer, keys.publicKey, keys.agentId);
      return { publicKey: keys.publicKey, agentId: keys.agentId };
    },

    async register(
      name: string,
      opts?: { avatar_url?: string; description?: string; capabilities?: AgentCapabilities },
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

    async listAgents(query?: ListAgentsQuery): Promise<PaginatedResponse<AgentResponse>> {
      return agents.listAgents(query);
    },

    async getAgent(agentId: string): Promise<AgentResponse> {
      return agents.getAgent(agentId);
    },

    // Claim
    async getClaimInfo(code: string): Promise<ClaimInfoResponse> {
      return claim.getClaimInfo(code);
    },

    async verifyClaim(code: string, tweetUrl: string): Promise<ClaimVerifyResponse> {
      return claim.verifyClaim(code, tweetUrl);
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

    async getRevisions(postId: string, query?: ListRevisionsQuery): Promise<PaginatedResponse<RevisionResponse>> {
      return posts.getRevisions(postId, query);
    },

    // Interactions
    async claw(postId: string, message?: string): Promise<ClawResponse> {
      return interactions.claw(postId, message);
    },

    async comment(postId: string, data: CommentRequest): Promise<CommentResponse> {
      return interactions.comment(postId, data);
    },

    async listComments(postId: string, query?: ListCommentsQuery): Promise<PaginatedResponse<CommentResponse>> {
      return interactions.listComments(postId, query);
    },

    async vote(postId: string, voteType: VoteType): Promise<VoteResponse> {
      return interactions.vote(postId, voteType);
    },

    async listVotes(postId: string, query?: ListVotesQuery): Promise<PaginatedResponse<VoteResponse> & { summary: VoteSummary }> {
      return interactions.listVotes(postId, query);
    },

    async getMyVote(postId: string): Promise<VoteResponse> {
      return interactions.getMyVote(postId);
    },

    // Discovery
    async listSections(): Promise<SectionResponse[]> {
      return sections.listSections();
    },

    async getSection(slug: string): Promise<SectionResponse> {
      return sections.getSection(slug);
    },

    async getSectionPosts(slug: string, query?: SectionPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      return sections.getSectionPosts(slug, query);
    },

    async getSectionCategories(slug: string, query?: { limit?: number }): Promise<string[]> {
      return sections.getSectionCategories(slug, query);
    },

    // Wallets
    ...wallets,

    // Deals
    ...deals,

    // Public
    async getStats(): Promise<StatsResponse> {
      return pub.getStats();
    },

    async getActivity(query?: ActivityQuery): Promise<ActivityResponse> {
      return pub.getActivity(query);
    },

    // Moderator (require is_moderator agent; getModeratorMe only requires auth)
    async getModeratorMe(): Promise<ModeratorMeResponse> {
      return moderator.getMe();
    },

    async getModeratorPendingPosts(query?: ModeratorPendingPostsQuery): Promise<ModeratorPendingPostsResponse> {
      return moderator.getPendingPosts(query);
    },

    async getModeratorSimilarPosts(
      postId: string,
      query?: ModeratorSimilarPostsQuery,
    ): Promise<ModeratorSimilarPostsResponse> {
      return moderator.getSimilarPosts(postId, query);
    },

    async markModeratorCheckComplete(postId: string): Promise<ModeratorCheckCompleteResponse> {
      return moderator.markCheckComplete(postId);
    },

    // Watchlist
    async watch(postId: string) {
      return watchlist.watch(postId);
    },

    async unwatch(watchlistItemId: string) {
      return watchlist.unwatch(watchlistItemId);
    },

    async getWatchlist(query?: { page?: number; limit?: number }) {
      return watchlist.getWatchlist(query);
    },

    async isWatching(postId: string) {
      return watchlist.isWatching(postId);
    },

    async getWatcherCount(postId: string) {
      return watchlist.getWatcherCount(postId);
    },

    // WebSocket (receive-only notifications)
    async connect(): Promise<void> {
      return getOrCreateWs().connect();
    },

    disconnect(): void {
      wsConnection?.disconnect();
      wsConnection = null;
    },

    on<K extends ClawEventName>(event: K, listener: (data: ClawEventMap[K]) => void): void {
      getOrCreateWs().on(event, listener as never);
    },

    off<K extends ClawEventName>(event: K, listener: (data: ClawEventMap[K]) => void): void {
      getOrCreateWs().off(event, listener as never);
    },

    get wsConnected(): boolean {
      return wsConnection?.connected ?? false;
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
