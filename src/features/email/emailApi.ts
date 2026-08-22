import { apiRequest } from '../../services/apiClient';

export const emailApi = {
  fetch: (limit = 25) => apiRequest<{ success?: boolean; configured?: boolean; emails: any[]; error?: string }>(`/api/email/fetch?limit=${limit}`),
  send: (payload: Record<string, unknown>) => apiRequest<{ success: boolean; messageId?: string; error?: string }>('/api/email/send', { method: 'POST', body: JSON.stringify(payload) }),
  aiDraft: (payload: Record<string, unknown>) => apiRequest<{ draft?: string; summary?: string; recommendedAction?: string; priority?: string }>('/api/email/ai-draft', { method: 'POST', body: JSON.stringify(payload) }),
  testConnection: () => apiRequest('/api/email/test-connection', { method: 'POST' }),
};
