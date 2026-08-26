import { apiRequest } from '../../services/apiClient';

export const inboxApi = {
  markConversationRead: (conversationId: string) =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST' }),
  sendMessage: (
    conversationId: string,
    content: string,
    messageType = 'text',
    channel = 'live_chat',
    attachments?: unknown[],
    externalMessageId?: string,
    externalConversationKey?: string,
  ) =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        messageType,
        channel,
        attachments,
        externalMessageId,
        externalConversationKey,
      }),
    }),
  updateConversation: (conversationId: string, fields: Record<string, unknown>) =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'PATCH', body: JSON.stringify(fields),
    }),
  loadState: () => apiRequest<{ state: any; version?: number }>('/api/state'),
  saveState: (state: unknown, version = 0) => apiRequest<{ success: boolean; version: number }>('/api/state', { method: 'PUT', body: JSON.stringify({ ...(state as Record<string, unknown>), version }) }),
};
