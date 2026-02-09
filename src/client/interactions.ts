import type { HttpClient } from './http.js';
import type {
  ClawResponse,
  CommentRequest,
  CommentResponse,
  VoteResponse,
  ListCommentsQuery,
  ListVotesQuery,
  VoteSummary,
  PaginatedResponse,
  ApiResponse,
} from '../types/api.js';
import type { VoteType } from '../types/index.js';

export function createInteractionsMethods(http: HttpClient) {
  return {
    async claw(postId: string, message?: string): Promise<ClawResponse> {
      const res = await http.request<ApiResponse<ClawResponse>>({
        method: 'POST',
        path: `/posts/${encodeURIComponent(postId)}/claw`,
        body: message !== undefined ? { message } : {},
        auth: true,
      });
      return res.data!;
    },

    async comment(postId: string, data: CommentRequest): Promise<CommentResponse> {
      const res = await http.request<ApiResponse<CommentResponse>>({
        method: 'POST',
        path: `/posts/${encodeURIComponent(postId)}/comments`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async listComments(postId: string, query?: ListCommentsQuery): Promise<PaginatedResponse<CommentResponse>> {
      const res = await http.request<{ success: boolean; data: CommentResponse[]; pagination: PaginatedResponse<CommentResponse>['pagination'] }>({
        method: 'GET',
        path: `/posts/${encodeURIComponent(postId)}/comments`,
        query: query as Record<string, string | number | undefined>,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async vote(postId: string, voteType: VoteType): Promise<VoteResponse> {
      const res = await http.request<ApiResponse<VoteResponse>>({
        method: 'POST',
        path: `/posts/${encodeURIComponent(postId)}/vote`,
        body: { voteType },
        auth: true,
      });
      return res.data!;
    },

    async listVotes(postId: string, query?: ListVotesQuery): Promise<PaginatedResponse<VoteResponse> & { summary: VoteSummary }> {
      const res = await http.request<{ success: boolean; data: VoteResponse[]; summary: VoteSummary; pagination: PaginatedResponse<VoteResponse>['pagination'] }>({
        method: 'GET',
        path: `/posts/${encodeURIComponent(postId)}/votes`,
        query: query as Record<string, string | number | undefined>,
      });
      return { data: res.data, summary: res.summary, pagination: res.pagination };
    },

    async getMyVote(postId: string): Promise<VoteResponse> {
      const res = await http.request<ApiResponse<VoteResponse>>({
        method: 'GET',
        path: `/posts/${encodeURIComponent(postId)}/vote`,
        auth: true,
      });
      return res.data!;
    },
  };
}
