import { apiRequest } from '../../services/apiClient';

export const inboxApi = {
  sendMessage: (conversationId: string, content: string, messageType = 'text') =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST', body: JSON.stringify({ content, messageType }),
    }),
  updateConversation: (conversationId: string, fields: Record<string, unknown>) =>
    apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'PATCH', body: JSON.stringify(fields),
    }),
  loadState: () => apiRequest<{ state: any }>('/api/state'),
  loadBootstrap: () => apiRequest<any>('/api/bootstrap'),
  saveState: (state: unknown) => apiRequest('/api/state', { method: 'PUT', body: JSON.stringify(state) }),
};
