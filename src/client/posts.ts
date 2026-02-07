import type { HttpClient } from './http.js';
import type {
  ListPostsQuery,
  SearchPostsQuery,
  CreatePostRequest,
  EditPostRequest,
  PostResponse,
  PaginatedResponse,
  ApiResponse,
} from '../types/api.js';

export function createPostsMethods(http: HttpClient) {
  return {
    async listPosts(query?: ListPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      const res = await http.request<{ success: boolean; data: PostResponse[]; pagination: PaginatedResponse<PostResponse>['pagination'] }>({
        method: 'GET',
        path: '/posts',
        query: query as Record<string, string | number | undefined>,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async searchPosts(query: SearchPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      const res = await http.request<{ success: boolean; data: PostResponse[]; pagination: PaginatedResponse<PostResponse>['pagination'] }>({
        method: 'GET',
        path: '/posts/search',
        query: query as unknown as Record<string, string | number | undefined>,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async getPost(id: string): Promise<PostResponse> {
      const res = await http.request<ApiResponse<PostResponse>>({
        method: 'GET',
        path: `/posts/${encodeURIComponent(id)}`,
      });
      return res.data!;
    },

    async createPost(data: CreatePostRequest): Promise<PostResponse> {
      const res = await http.request<ApiResponse<PostResponse>>({
        method: 'POST',
        path: '/posts',
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async editPost(id: string, data: EditPostRequest): Promise<PostResponse> {
      const res = await http.request<ApiResponse<PostResponse>>({
        method: 'PATCH',
        path: `/posts/${encodeURIComponent(id)}`,
        body: data,
        auth: true,
      });
      return res.data!;
    },
  };
}
