import { apiRequest } from '../../services/apiClient';

import { io, type Socket } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;

export const channelApi = {
  fetchFacebookPage: () => apiRequest<{ page: { id: string; name: string } }>('/api/channels/facebook/page'),
  sendFacebookMessage: (payload: { recipientId: string; text: string }) =>
    apiRequest<{ success: boolean; messageId?: string; error?: string }>('/api/channels/facebook/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  socket: (): Socket => io(`${backendUrl}/inbox`, { transports: ['websocket', 'polling'], withCredentials: true }),
  fetchFacebookEvents: () => apiRequest<{ events: Array<{ eventId: string; senderId: string; senderName: string; content: string; timestamp: number; pageId?: string }> }>('/api/channels/facebook/events'),
};
