import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { toDataURL } from 'qrcode';
import type { Server as SocketIOServer } from 'socket.io';

export type WhatsAppStatus = {
  connected: boolean;
  phoneNumber?: string;
};

export type WhatsAppIncomingMessage = {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
};

const authDirectory = fileURLToPath(new URL('../../auth_sessions', import.meta.url));
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' });
const maxReconnectAttempts = 5;
const reconnectDelayMs = 3000;

let socket: WASocket | null = null;
let connecting: Promise<void> | null = null;
let reconnectAttempts = 0;
let deliberateLogout = false;
let activePhoneNumber: string | undefined;
const processedMessageIds = new Map<string, number>();

function emit(io: SocketIOServer, event: string, payload?: unknown) {
  io.emit(event, payload);
  io.of('/whatsapp').emit(event, payload);
}

function getDisconnectCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const output = (error as { output?: { statusCode?: unknown } }).output;
  return typeof output?.statusCode === 'number' ? output.statusCode : undefined;
}

function getText(message: WAMessage): string | null {
  return message.message?.conversation || message.message?.extendedTextMessage?.text || null;
}

async function connect(io: SocketIOServer): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
  const nextSocket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });
  socket = nextSocket;
  nextSocket.ev.on('creds.update', saveCreds);

  nextSocket.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        const dataUrl = await toDataURL(qr, { type: 'image/png', margin: 1, width: 320 });
        emit(io, 'whatsapp:qr', dataUrl);
      } catch (error) {
        logger.warn({ err: error }, 'Unable to convert WhatsApp QR to a data URL');
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      activePhoneNumber = nextSocket.user?.id?.split(':')[0];
      emit(io, 'whatsapp:connected', { phoneNumber: activePhoneNumber });
      return;
    }

    if (connection !== 'close') return;

    const disconnectCode = getDisconnectCode(lastDisconnect?.error);
    const loggedOut = deliberateLogout || disconnectCode === DisconnectReason.loggedOut;
    socket = null;
    activePhoneNumber = undefined;

    if (loggedOut) {
      deliberateLogout = false;
      reconnectAttempts = 0;
      emit(io, 'whatsapp:disconnected', { reason: 'logged_out' });
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      emit(io, 'whatsapp:disconnected', { reason: 'reconnect_limit_reached' });
      return;
    }

    reconnectAttempts += 1;
    const delay = reconnectDelayMs * reconnectAttempts;
    setTimeout(() => {
      void startWhatsAppConnection(io);
    }, delay);
  });

  nextSocket.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      if (message.key.fromMe || !message.key.remoteJid) continue;
      if (message.key.remoteJid.endsWith('@g.us')) {
        logger.info({ jid: message.key.remoteJid }, 'Skipping WhatsApp group message until group routing is supported');
        continue;
      }
      const messageId = message.key.id;
      if (!messageId || processedMessageIds.has(messageId)) continue;
      processedMessageIds.set(messageId, Date.now());
      if (processedMessageIds.size > 5000) {
        const oldest = [...processedMessageIds.entries()].sort((a, b) => a[1] - b[1])[0];
        if (oldest) processedMessageIds.delete(oldest[0]);
      }
      const content = getText(message);
      if (!content) {
        logger.info({ messageId }, 'Skipping unsupported WhatsApp message type');
        continue;
      }

      const normalized: WhatsAppIncomingMessage = {
        senderId: message.key.remoteJid,
        senderName: message.pushName || message.key.remoteJid.split('@')[0],
        content,
        timestamp: Number(message.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
      };
      emit(io, 'whatsapp:message', normalized);
    }
  });
}

export async function startWhatsAppConnection(io: SocketIOServer): Promise<void> {
  if (socket || connecting) return connecting || Promise.resolve();
  deliberateLogout = false;
  connecting = connect(io).finally(() => {
    connecting = null;
  });
  return connecting;
}

export function getWhatsAppStatus(): WhatsAppStatus {
  return { connected: Boolean(socket?.user), ...(activePhoneNumber ? { phoneNumber: activePhoneNumber } : {}) };
}

export async function sendWhatsAppMessage(jid: string, text: string): Promise<void> {
  if (!socket?.user) throw new Error('WhatsApp is not connected.');
  if (!jid.trim() || !text.trim()) throw new Error('WhatsApp JID and message text are required.');
  await socket.sendMessage(jid, { text });
}

export async function sendWhatsAppVoice(jid: string, audioDataUrl: string, mimetype = 'audio/webm'): Promise<void> {
  if (!socket?.user) throw new Error('WhatsApp is not connected.');
  if (!jid.trim() || !audioDataUrl.startsWith('data:audio/')) throw new Error('WhatsApp JID and valid audio data are required.');
  const encoded = audioDataUrl.slice(audioDataUrl.indexOf(',') + 1);
  const audio = Buffer.from(encoded, 'base64');
  if (!audio.length || audio.length > 8 * 1024 * 1024) throw new Error('Voice message must be between 1 byte and 8 MB.');
  await socket.sendMessage(jid, { audio, mimetype, ptt: true });
}

export async function logoutWhatsAppConnection(): Promise<void> {
  deliberateLogout = true;
  if (socket) {
    await socket.logout();
    socket = null;
  }
  activePhoneNumber = undefined;
  reconnectAttempts = 0;
}

export async function clearWhatsAppAuthSession(): Promise<void> {
  await fs.rm(authDirectory, { recursive: true, force: true });
}
