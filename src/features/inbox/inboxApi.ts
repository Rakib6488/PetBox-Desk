import { apiRequest } from '../../services/apiClient';

export const inboxApi = {
  loadMessages: (conversationId: string, externalConversationKey?: string) =>
    apiRequest<{ messages: any[] }>(`/api/conversations/${encodeURIComponent(conversationId)}/messages${externalConversationKey ? `?externalConversationKey=${encodeURIComponent(externalConversationKey)}` : ''}`),
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
  saveConversationSummary: (conversationId: string, summary: Record<string, unknown>) =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/summary`, {
      method: 'PUT', body: JSON.stringify(summary),
    }),
  loadConversationSummary: (conversationId: string) =>
    apiRequest<{ summary: Record<string, unknown> | null }>(`/api/conversations/${encodeURIComponent(conversationId)}/summary`),
  loadConversationSummaries: () =>
    apiRequest<{ summaries: Array<{ conversationId: string; text: string; customerMessageCount: number; lastCustomerMessage: string; lastCustomerMessageAt: string; updatedAt: string }> }>('/api/conversation-summaries'),
  loadState: () => apiRequest<{ state: any; version?: number }>('/api/state'),
  saveState: (state: unknown, version = 0) => apiRequest<{ success: boolean; version: number }>('/api/state', { method: 'PUT', body: JSON.stringify({ ...(state as Record<string, unknown>), version }) }),
};
