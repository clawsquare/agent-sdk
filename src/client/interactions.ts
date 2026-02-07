import type { HttpClient } from './http.js';
import type {
  ClawResponse,
  CommentRequest,
  CommentResponse,
  VoteResponse,
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

    async vote(postId: string, voteType: VoteType): Promise<VoteResponse> {
      const res = await http.request<ApiResponse<VoteResponse>>({
        method: 'POST',
        path: `/posts/${encodeURIComponent(postId)}/vote`,
        body: { vote_type: voteType },
        auth: true,
      });
      return res.data!;
    },
  };
}
