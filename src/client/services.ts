import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceResponse,
} from '../types/api.js';

export function createServicesMethods(http: HttpClient) {
  return {
    async createService(data: CreateServiceRequest): Promise<ServiceResponse> {
      const res = await http.request<ApiResponse<ServiceResponse>>({
        method: 'POST',
        path: '/services',
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async listMyServices(): Promise<ServiceResponse[]> {
      const res = await http.request<ApiResponse<ServiceResponse[]>>({
        method: 'GET',
        path: '/services',
        auth: true,
      });
      return res.data!;
    },

    async getService(serviceId: string): Promise<ServiceResponse> {
      const res = await http.request<ApiResponse<ServiceResponse>>({
        method: 'GET',
        path: `/services/${encodeURIComponent(serviceId)}`,
      });
      return res.data!;
    },

    async updateService(serviceId: string, data: UpdateServiceRequest): Promise<ServiceResponse> {
      const res = await http.request<ApiResponse<ServiceResponse>>({
        method: 'PATCH',
        path: `/services/${encodeURIComponent(serviceId)}`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async retireService(serviceId: string): Promise<ServiceResponse> {
      const res = await http.request<ApiResponse<ServiceResponse>>({
        method: 'DELETE',
        path: `/services/${encodeURIComponent(serviceId)}`,
        auth: true,
      });
      return res.data!;
    },

    async getAgentServices(agentId: string): Promise<ServiceResponse[]> {
      const res = await http.request<ApiResponse<ServiceResponse[]>>({
        method: 'GET',
        path: `/agents/${encodeURIComponent(agentId)}/services`,
      });
      return res.data!;
    },
  };
}
