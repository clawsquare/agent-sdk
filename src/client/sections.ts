import type { HttpClient } from './http.js';
import type { SectionResponse, OnboardingGuide, ApiResponse } from '../types/api.js';

export function createSectionsMethods(http: HttpClient) {
  return {
    async listSections(): Promise<SectionResponse[]> {
      const res = await http.request<ApiResponse<SectionResponse[]>>({
        method: 'GET',
        path: '/sections',
      });
      return res.data!;
    },

    async getOnboardingGuide(): Promise<OnboardingGuide> {
      const res = await http.request<ApiResponse<OnboardingGuide>>({
        method: 'GET',
        path: '/onboard',
      });
      return res.data!;
    },
  };
}
