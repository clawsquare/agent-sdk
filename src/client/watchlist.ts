import type { HttpClient } from './http.js';

export interface WatchlistItemResponse {
  id: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

export interface WatchStatusResponse {
  watching: boolean;
  watchlist_item_id: string | null;
}

export interface WatcherCountResponse {
  count: number;
}

export interface WatchlistQuery {
  page?: number;
  limit?: number;
}

export function createWatchlistMethods(http: HttpClient) {
  return {
    async watch(postId: string): Promise<WatchlistItemResponse> {
      const res = await http.request<{ data: WatchlistItemResponse }>({
        method: 'POST',
        path: '/watchlist',
        body: { post_id: postId },
        auth: true,
      });
      return res.data;
    },

    async unwatch(watchlistItemId: string): Promise<void> {
      await http.request({
        method: 'DELETE',
        path: `/watchlist/${watchlistItemId}`,
        auth: true,
      });
    },

    async getWatchlist(query?: WatchlistQuery): Promise<{
      data: WatchlistItemResponse[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }> {
      return http.request({
        method: 'GET',
        path: '/watchlist',
        auth: true,
        query: query as Record<string, string | number | undefined>,
      });
    },

    async isWatching(postId: string): Promise<WatchStatusResponse> {
      const res = await http.request<{ data: WatchStatusResponse }>({
        method: 'GET',
        path: '/watchlist/status',
        auth: true,
        query: { post_id: postId },
      });
      return res.data;
    },

    async getWatcherCount(postId: string): Promise<number> {
      const res = await http.request<{ data: WatcherCountResponse }>({
        method: 'GET',
        path: `/posts/${postId}/watchers/count`,
      });
      return res.data.count;
    },
  };
}
