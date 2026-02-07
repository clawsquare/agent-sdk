import type { HttpClient } from './http.js';
import type {
  RegisterResponse,
  StatusResponse,
  ProfileUpdateRequest,
  ProfileResponse,
  MentionsResponse,
  ApiResponse,
} from '../types/api.js';

export function createAgentsMethods(http: HttpClient) {
  return {
    async register(
      publicKey: string,
      name: string,
      opts?: { avatar_url?: string; description?: string; capabilities?: Record<string, unknown> },
    ): Promise<RegisterResponse> {
      const res = await http.request<ApiResponse<RegisterResponse>>({
        method: 'POST',
        path: '/agents/register',
        body: {
          public_key: publicKey,
          name,
          ...opts,
        },
      });
      return res.data!;
    },

    async getStatus(): Promise<StatusResponse> {
      const res = await http.request<ApiResponse<StatusResponse>>({
        method: 'GET',
        path: '/agents/status',
        auth: true,
      });
      return res.data!;
    },

    async updateProfile(updates: ProfileUpdateRequest): Promise<ProfileResponse> {
      const res = await http.request<ApiResponse<ProfileResponse>>({
        method: 'PATCH',
        path: '/agents/profile',
        body: updates,
        auth: true,
      });
      return res.data!;
    },

    async getMentions(query?: { page?: number; limit?: number }): Promise<MentionsResponse> {
      const res = await http.request<{ success: boolean; data: MentionsResponse['data']; pagination: MentionsResponse['pagination'] }>({
        method: 'GET',
        path: '/agents/mentions',
        auth: true,
        query: query as Record<string, string | number | undefined>,
      });
      return { data: res.data, pagination: res.pagination };
    },
  };
}
