import { io, type Socket } from 'socket.io-client';

// The browser always talks to the integrated, session-authenticated server.
// The standalone WhatsApp service is for trusted server-to-server callers and
// must not receive its API key through a VITE client bundle.
const backendUrl = window.location.origin;

export type WhatsAppStatus = { connected: boolean; phoneNumber?: string };
export type WhatsAppIncomingMessage = {
  messageId?: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  relationalPersistenceStatus?: 'persisted' | 'workspace_only';
};

export function normalizeWhatsAppPhone(senderId: string): string {
  const withoutSuffix = senderId.trim().toLowerCase().replace(/@(s\.whatsapp\.net|c\.us|lid)$/i, '');
  const withoutDevice = withoutSuffix.split(':')[0];
  return withoutDevice.replace(/\D/g, '') || 'unknown';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `WhatsApp request failed (${response.status})`);
  return payload as T;
}

export const whatsappApi = {
  status: () => request<WhatsAppStatus>('/api/whatsapp/status'),
  connect: () => request<WhatsAppStatus & { ok: boolean }>('/api/whatsapp/connect', { method: 'POST' }),
  disconnect: () => request<{ ok: boolean }>('/api/whatsapp/disconnect', { method: 'POST' }),
  send: (jid: string, text: string) => request<{ ok: boolean; messageId?: string }>('/api/whatsapp/send', { method: 'POST', body: JSON.stringify({ jid, text }) }),
  sendVoice: (jid: string, audio: string, mimetype = 'audio/webm') => request<{ ok: boolean; messageId?: string }>('/api/whatsapp/send-voice', { method: 'POST', body: JSON.stringify({ jid, audio, mimetype }) }),
  socket: (): Socket => io(`${backendUrl}/whatsapp`, {
    transports: ['polling', 'websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
  }),
};
