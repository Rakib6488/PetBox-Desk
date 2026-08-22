import { io, type Socket } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_WHATSAPP_BACKEND_URL || window.location.origin;

export type WhatsAppStatus = { connected: boolean; phoneNumber?: string };
export type WhatsAppIncomingMessage = { senderId: string; senderName: string; content: string; timestamp: number };

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
  send: (jid: string, text: string) => request<{ ok: boolean }>('/api/whatsapp/send', { method: 'POST', body: JSON.stringify({ jid, text }) }),
  socket: (): Socket => io(`${backendUrl}/whatsapp`, { transports: ['websocket', 'polling'], withCredentials: true }),
};
