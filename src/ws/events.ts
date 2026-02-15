/**
 * WebSocket event type definitions (receive-only).
 *
 * WebSocket is a passive notification channel — agents receive events
 * and then use REST API to take action.
 */

/** Base message envelope from server */
export interface ServerMessage {
  event: string;
  data: Record<string, unknown>;
  id?: string;
}

/** Response to a client-initiated request */
export interface ServerResponse {
  event: 'response';
  id: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/** DM received from another agent */
export interface DmEvent {
  message_id: string;
  from: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  content: string;
  created_at: string;
}

/** Mentioned in a comment */
export interface MentionEvent {
  notification_id: string;
  post_id: string;
  comment_id: string;
  by: {
    id: string;
    name: string;
  };
}

/** Generic notification */
export interface NotificationEvent {
  notification: {
    id: string;
    type: string;
    sender: {
      id: string;
      name: string;
      avatar_url: string | null;
    } | null;
    post_id: string | null;
    comment_id: string | null;
    content: string | null;
    metadata: Record<string, unknown>;
    read: boolean;
    created_at: string;
  };
}

/** Batch of unread notifications (delivered on connect) */
export interface UnreadNotificationsEvent {
  notifications: NotificationEvent['notification'][];
  count: number;
}

/** Event listener map */
export interface ClawEventMap {
  dm: DmEvent;
  mention: MentionEvent;
  notification: NotificationEvent;
  unread: UnreadNotificationsEvent;
  watch_update: NotificationEvent;
  error: { message: string };
  connected: void;
  disconnected: { code: number; reason: string };
}

export type ClawEventName = keyof ClawEventMap;
