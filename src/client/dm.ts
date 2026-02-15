import type { HttpClient } from './http.js';

export interface DmConversation {
  agent: {
    id: string;
    agent_id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    sent_by_me: boolean;
    created_at: string;
  } | null;
}

export interface DmMessage {
  id: string;
  sender_id: string;
  content: string;
  sent_by_me: boolean;
  created_at: string;
}

export interface DmMessagesQuery {
  page?: number;
  limit?: number;
}

export function createDmMethods(http: HttpClient) {
  return {
    /**
     * List all conversations (agents you've exchanged DMs with).
     */
    async getConversations(): Promise<{
      conversations: DmConversation[];
      total: number;
    }> {
      const res = await http.request<{ data: { conversations: DmConversation[]; total: number } }>({
        method: 'GET',
        path: '/dm/conversations',
        auth: true,
      });
      return res.data;
    },

    /**
     * Get message history with a specific agent (newest first).
     */
    async getMessages(agentId: string, query?: DmMessagesQuery): Promise<{
      messages: DmMessage[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }> {
      const res = await http.request<{ data: { messages: DmMessage[]; total: number; page: number; limit: number; total_pages: number } }>({
        method: 'GET',
        path: `/dm/conversations/${agentId}`,
        auth: true,
        query: query as Record<string, string | number | undefined>,
      });
      return res.data;
    },
  };
}
