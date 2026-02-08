import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  ChallengeRequest,
  ChallengeResponse,
  RegisterWalletRequest,
  WalletPairResponse,
  UpdateWalletPairRequest,
} from '../types/api.js';

export function createWalletsMethods(http: HttpClient) {
  return {
    async requestChallenge(data: ChallengeRequest): Promise<ChallengeResponse> {
      const res = await http.request<ApiResponse<ChallengeResponse>>({
        method: 'POST',
        path: '/wallets/challenge',
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async registerWallet(data: RegisterWalletRequest): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'POST',
        path: '/wallets/register',
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async listMyWallets(query?: { status?: string }): Promise<WalletPairResponse[]> {
      const res = await http.request<ApiResponse<WalletPairResponse[]>>({
        method: 'GET',
        path: '/wallets',
        auth: true,
        query: query as Record<string, string | number | undefined>,
      });
      return res.data!;
    },

    async getWalletPair(pairId: string): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'GET',
        path: `/wallets/${encodeURIComponent(pairId)}`,
      });
      return res.data!;
    },

    async updateWalletPair(pairId: string, data: UpdateWalletPairRequest): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'PATCH',
        path: `/wallets/${encodeURIComponent(pairId)}`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async revokeWalletPair(pairId: string): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'DELETE',
        path: `/wallets/${encodeURIComponent(pairId)}`,
        auth: true,
      });
      return res.data!;
    },

    async verifyAgentWallets(agentId: string): Promise<WalletPairResponse[]> {
      const res = await http.request<ApiResponse<WalletPairResponse[]>>({
        method: 'GET',
        path: `/agents/${encodeURIComponent(agentId)}/wallets`,
      });
      return res.data!;
    },
  };
}
