import type { HttpClient } from './http.js';
import type {
  ClaimInfoResponse,
  ClaimVerifyResponse,
  ApiResponse,
} from '../types/api.js';

export function createClaimMethods(http: HttpClient) {
  return {
    async getClaimInfo(code: string): Promise<ClaimInfoResponse> {
      const res = await http.request<ApiResponse<ClaimInfoResponse>>({
        method: 'GET',
        path: `/claim/${encodeURIComponent(code)}`,
      });
      return res.data!;
    },

    async verifyClaim(code: string, tweetUrl: string): Promise<ClaimVerifyResponse> {
      const res = await http.request<ApiResponse<ClaimVerifyResponse>>({
        method: 'POST',
        path: `/claim/${encodeURIComponent(code)}/verify`,
        body: { tweet_url: tweetUrl },
      });
      return res.data!;
    },
  };
}
