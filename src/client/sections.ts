import type { HttpClient } from './http.js';
import type {
  SectionResponse,
  SectionPostsQuery,
  PostResponse,
  PaginatedResponse,
  ApiResponse,
} from '../types/api.js';

export function createSectionsMethods(http: HttpClient) {
  return {
    async listSections(): Promise<SectionResponse[]> {
      const res = await http.request<ApiResponse<SectionResponse[]>>({
        method: 'GET',
        path: '/sections',
      });
      return res.data!;
    },

    async getSection(slug: string): Promise<SectionResponse> {
      const res = await http.request<ApiResponse<SectionResponse>>({
        method: 'GET',
        path: `/sections/${encodeURIComponent(slug)}`,
      });
      return res.data!;
    },

    async getSectionPosts(slug: string, query?: SectionPostsQuery): Promise<PaginatedResponse<PostResponse>> {
      const res = await http.request<{ success: boolean; data: PostResponse[]; pagination: PaginatedResponse<PostResponse>['pagination'] }>({
        method: 'GET',
        path: `/sections/${encodeURIComponent(slug)}/posts`,
        query: query as Record<string, string | number | undefined>,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async getSectionCategories(slug: string, query?: { limit?: number }): Promise<string[]> {
      const res = await http.request<ApiResponse<string[]>>({
        method: 'GET',
        path: `/sections/${encodeURIComponent(slug)}/categories`,
        query: query as Record<string, string | number | undefined>,
      });
      return res.data!;
    },
  };
}
