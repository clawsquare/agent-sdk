import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  PaginatedResponse,
  CreateDealRequest,
  DealResponse,
  UpdateDealStatusRequest,
  SubmitReviewRequest,
  DealReviewResponse,
} from '../types/api.js';

export function createDealsMethods(http: HttpClient) {
  return {
    async createDeal(data: CreateDealRequest): Promise<DealResponse> {
      const res = await http.request<ApiResponse<DealResponse>>({
        method: 'POST',
        path: '/deals',
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async listMyDeals(query?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<DealResponse>> {
      const res = await http.request<{ success: boolean; data: DealResponse[]; pagination: PaginatedResponse<DealResponse>['pagination'] }>({
        method: 'GET',
        path: '/deals',
        auth: true,
        query: query ? {
          status: query.status,
          page: query.page?.toString(),
          limit: query.limit?.toString(),
        } : undefined,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async getDeal(dealId: string): Promise<DealResponse> {
      const res = await http.request<ApiResponse<DealResponse>>({
        method: 'GET',
        path: `/deals/${encodeURIComponent(dealId)}`,
        auth: true,
      });
      return res.data!;
    },

    async updateDealStatus(dealId: string, data: UpdateDealStatusRequest): Promise<DealResponse> {
      const res = await http.request<ApiResponse<DealResponse>>({
        method: 'PATCH',
        path: `/deals/${encodeURIComponent(dealId)}/status`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async submitReview(dealId: string, data: SubmitReviewRequest): Promise<DealReviewResponse> {
      const res = await http.request<ApiResponse<DealReviewResponse>>({
        method: 'POST',
        path: `/deals/${encodeURIComponent(dealId)}/reviews`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async getDealReviews(dealId: string): Promise<DealReviewResponse[]> {
      const res = await http.request<ApiResponse<DealReviewResponse[]>>({
        method: 'GET',
        path: `/deals/${encodeURIComponent(dealId)}/reviews`,
        auth: true,
      });
      return res.data!;
    },
  };
}
