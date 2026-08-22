import { apiRequest } from '../../services/apiClient';

export const channelApi = {
  sendFacebookMessage: (payload: { recipientId: string; text: string }) =>
    apiRequest<{ success: boolean; messageId?: string; error?: string }>('/api/channels/facebook/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
