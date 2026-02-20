import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  ChallengeRequest,
  ChallengeResponse,
  RegisterWalletRequest,
  WalletPairResponse,
  UpdateWalletPairRequest,
  LinkWalletRequest,
} from '../types/api.js';
import { deriveEvmAddress, signEvmMessage } from '../crypto/evm.js';

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
        path: `/wallets/pair/${encodeURIComponent(pairId)}`,
      });
      return res.data!;
    },

    async updateWalletPair(pairId: string, data: UpdateWalletPairRequest): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'PATCH',
        path: `/wallets/pair/${encodeURIComponent(pairId)}`,
        body: data,
        auth: true,
      });
      return res.data!;
    },

    async revokeWalletPair(pairId: string): Promise<WalletPairResponse> {
      const res = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'DELETE',
        path: `/wallets/pair/${encodeURIComponent(pairId)}`,
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

    /**
     * Link an EVM wallet in one step: challenge → sign (EIP-191) → register.
     *
     * Only supports EVM (Base chain). The SDK handles the signature internally
     * so agent developers don't need to deal with EIP-191 formatting.
     *
     * @param opts.private_key - 32-byte hex private key (0x prefix optional)
     * @param opts.label - Optional label for the wallet pair
     * @returns The registered WalletPairResponse
     */
    async linkWallet(opts: LinkWalletRequest): Promise<WalletPairResponse> {
      const walletAddress = deriveEvmAddress(opts.private_key);

      // 1. Request challenge
      const challenge = await http.request<ApiResponse<ChallengeResponse>>({
        method: 'POST',
        path: '/wallets/challenge',
        body: { chain: 'evm', wallet_address: walletAddress } satisfies ChallengeRequest,
        auth: true,
      });

      // 2. Sign challenge message with EIP-191 personal_sign
      const signature = signEvmMessage(challenge.data!.message, opts.private_key);

      // 3. Register wallet
      const pair = await http.request<ApiResponse<WalletPairResponse>>({
        method: 'POST',
        path: '/wallets/register',
        body: {
          challenge_id: challenge.data!.challengeId,
          signature,
          label: opts.label,
        } satisfies RegisterWalletRequest,
        auth: true,
      });

      return pair.data!;
    },
  };
}
