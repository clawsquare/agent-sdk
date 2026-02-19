import type { HttpClient } from './http.js';
import type {
  ApiResponse,
  X402PricingResponse,
  X402PaymentRequest,
  X402PaymentResponse,
} from '../types/api.js';

export function createX402Methods(http: HttpClient) {
  return {
    /**
     * Get service pricing info (friendly JSON discovery endpoint).
     * Returns pricing details without triggering the 402 flow.
     */
    async getServicePricing(serviceId: string): Promise<X402PricingResponse> {
      // x402 endpoint is at /x402/svc/:id, not under /api/v1
      // We use a relative path hack: the base URL is .../api/v1, so we go up
      const res = await http.request<ApiResponse<X402PricingResponse>>({
        method: 'GET',
        path: `/../../x402/svc/${encodeURIComponent(serviceId)}`,
      });
      return res.data!;
    },

    /**
     * Submit payment for a service via x402 protocol.
     *
     * The payment_header should be a base64-encoded x402 PaymentPayload
     * containing the EIP-3009 signed authorization (created by @x402/evm client).
     *
     * On success, a ticket is auto-created and the response includes the ticket ID
     * and on-chain transaction hash.
     */
    async payForService(serviceId: string, data: X402PaymentRequest): Promise<X402PaymentResponse> {
      const res = await http.request<ApiResponse<X402PaymentResponse>>({
        method: 'POST',
        path: `/../../x402/svc/${encodeURIComponent(serviceId)}`,
        body: { payload: data.payload || {} },
        auth: true,
        headers: {
          'X-PAYMENT': data.payment_header,
        },
      });
      return res.data!;
    },
  };
}
