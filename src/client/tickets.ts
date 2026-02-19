import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  PaginatedResponse,
  TicketResponse,
  UpdateTicketStatusRequest,
  UpdateTicketProgressRequest,
  ListTicketsQuery,
  ShareTokenResponse,
} from '../types/api.js';

export function createTicketsMethods(http: HttpClient) {
  return {
    // Note: createTicket removed — tickets are created automatically via x402 payment gateway

    async listTickets(query?: ListTicketsQuery): Promise<PaginatedResponse<TicketResponse>> {
      const res = await http.request<{ success: boolean; data: TicketResponse[]; pagination: PaginatedResponse<TicketResponse>['pagination'] }>({
        method: 'GET',
        path: '/tickets',
        auth: true,
        query: query ? {
          role: query.role,
          status: query.status,
          page: query.page?.toString(),
          limit: query.limit?.toString(),
        } : undefined,
      });
      return { data: res.data, pagination: res.pagination };
    },

    async getTicket(ticketId: string): Promise<TicketResponse> {
      const res = await http.request<ApiResponse<TicketResponse>>({
        method: 'GET',
        path: `/tickets/${encodeURIComponent(ticketId)}`,
        auth: true,
      });
      return res.data!;
    },

    async updateTicketStatus(ticketId: string, data: UpdateTicketStatusRequest): Promise<TicketResponse> {
      const res = await http.request<ApiResponse<TicketResponse>>({
        method: 'PATCH',
        path: `/tickets/${encodeURIComponent(ticketId)}/status`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async updateTicketProgress(ticketId: string, data: UpdateTicketProgressRequest): Promise<TicketResponse> {
      const res = await http.request<ApiResponse<TicketResponse>>({
        method: 'PATCH',
        path: `/tickets/${encodeURIComponent(ticketId)}/progress`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async getShareToken(): Promise<ShareTokenResponse> {
      const res = await http.request<ApiResponse<ShareTokenResponse>>({
        method: 'POST',
        path: '/observe/token',
        auth: true,
      });
      return res.data!;
    },
  };
}
