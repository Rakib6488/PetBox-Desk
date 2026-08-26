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
import { dbPool } from '../../../src/server/db.js';

export type WhatsAppStatus = {
  connected: boolean;
  phoneNumber?: string;
};

export type WhatsAppIncomingMessage = {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
};

function normalizeWhatsAppPhone(senderId: string): string {
  const withoutSuffix = senderId.trim().toLowerCase().replace(/@(s\.whatsapp\.net|c\.us|lid)$/i, '');
  const withoutDevice = withoutSuffix.split(':')[0];
  return withoutDevice.replace(/\D/g, '') || 'unknown';
}

const WHATSAPP_EXTERNAL_ACCOUNT_ID = 'whatsapp';

type PersistWhatsAppInboundArgs = {
  conversationId: string;
  content: string;
  senderId: string;
  messageId: string;
  externalConversationKey: string;
};

async function persistWhatsAppInboundMessage(
  pool: NonNullable<typeof dbPool>,
  args: PersistWhatsAppInboundArgs,
): Promise<{ unreadCount: number }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT conversation_key_upsert');

    let conversationResult;

    try {
      conversationResult = await client.query(
        `INSERT INTO conversations
           (id, channel, status, unread_count, updated_at, external_conversation_key)
         VALUES ($1, 'whatsapp', 'open', 0, NOW(), $2)
         ON CONFLICT (id) DO UPDATE
         SET status = CASE
                       WHEN conversations.status = 'closed' THEN 'open'
                       ELSE conversations.status
                     END,
             external_conversation_key = COALESCE(
               conversations.external_conversation_key,
               EXCLUDED.external_conversation_key
             ),
             updated_at = NOW()
         RETURNING id, unread_count`,
        [args.conversationId, args.externalConversationKey],
      );

      await client.query('RELEASE SAVEPOINT conversation_key_upsert');
    } catch (error: any) {
      const isExternalKeyCollision =
        error?.code === '23505'
        && String(error?.constraint || '').includes('idx_conversations_external_key');

      if (!isExternalKeyCollision) throw error;

      await client.query('ROLLBACK TO SAVEPOINT conversation_key_upsert');

      logger.warn({
        conversationId: args.conversationId,
        externalConversationKey: args.externalConversationKey,
        constraint: error?.constraint,
      }, 'WhatsApp conversation external-key collision; continuing without claiming key');

      conversationResult = await client.query(
        `INSERT INTO conversations
           (id, channel, status, unread_count, updated_at)
         VALUES ($1, 'whatsapp', 'open', 0, NOW())
         ON CONFLICT (id) DO UPDATE
         SET status = CASE
                       WHEN conversations.status = 'closed' THEN 'open'
                       ELSE conversations.status
                     END,
             updated_at = NOW()
         RETURNING id, unread_count`,
        [args.conversationId],
      );

      await client.query('RELEASE SAVEPOINT conversation_key_upsert');
    }

    const messageResult = await client.query(
      `INSERT INTO messages (
         id,
         conversation_id,
         sender_type,
         sender_id,
         content,
         message_type,
         channel,
         attachments,
         external_message_id,
         status
       )
       VALUES ($1, $2, 'contact', $3, $4, 'text', 'whatsapp', NULL, $5, 'delivered')
       ON CONFLICT (channel, external_message_id) DO NOTHING
       RETURNING id`,
      [
        `wa_msg_${args.messageId}`,
        args.conversationId,
        args.senderId,
        args.content,
        args.messageId,
      ],
    );

    if (messageResult.rowCount) {
      conversationResult = await client.query(
        `UPDATE conversations
         SET unread_count = unread_count + 1,
             status = CASE
                       WHEN status = 'closed' THEN 'open'
                       ELSE status
                     END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, unread_count`,
        [args.conversationId],
      );
    }

    await client.query('COMMIT');

    return {
      unreadCount: Number(conversationResult.rows[0]?.unread_count || 0),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

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

function emitBadgeUpdate(io: SocketIOServer, conversationId: string, unreadCount: number) {
  const payload = { channel: 'whatsapp', conversationId, unreadCount };
  io.of('/whatsapp').emit('badge:update', payload);
  io.of('/inbox').emit('badge:update', payload);
}

function getDisconnectCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const output = (error as { output?: { statusCode?: unknown } }).output;
  return typeof output?.statusCode === 'number' ? output.statusCode : undefined;
}

function getText(message: WAMessage): string | null {
  let content = message.message as any;
  // WhatsApp wraps normal messages in these containers when disappearing,
  // view-once, or edited-message mode is enabled.
  for (let depth = 0; depth < 4; depth += 1) {
    const wrapped = content?.ephemeralMessage?.message
      || content?.viewOnceMessage?.message
      || content?.viewOnceMessageV2?.message
      || content?.viewOnceMessageV2Extension?.message
      || content?.documentWithCaptionMessage?.message
      || content?.editedMessage?.message;
    if (!wrapped) break;
    content = wrapped;
  }

  return content?.conversation
    || content?.extendedTextMessage?.text
    || content?.imageMessage?.caption
    || content?.videoMessage?.caption
    || content?.documentMessage?.caption
    || content?.buttonsResponseMessage?.selectedDisplayText
    || content?.listResponseMessage?.title
    || null;
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

  nextSocket.ev.on('messages.upsert', async ({ messages, type }) => {
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
        messageId,
        conversationId: `conv_wa_${normalizeWhatsAppPhone(message.key.remoteJid)}`,
        senderId: message.key.remoteJid,
        senderName: message.pushName || message.key.remoteJid.split('@')[0],
        content,
        timestamp: Number(message.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
      };

      let unreadCount: number | undefined;
      let relationalPersistenceStatus: 'persisted' | 'workspace_only' = 'workspace_only';
      if (dbPool) {
        try {
          const externalConversationKey =
            `whatsapp:${WHATSAPP_EXTERNAL_ACCOUNT_ID}:${normalizeWhatsAppPhone(message.key.remoteJid)}`;

          const persisted = await persistWhatsAppInboundMessage(dbPool, {
            conversationId: normalized.conversationId,
            content: normalized.content,
            senderId: message.key.remoteJid,
            messageId,
            externalConversationKey,
          });

          unreadCount = persisted.unreadCount;
          relationalPersistenceStatus = 'persisted';
        } catch (error) {
          logger.error({
            err: error,
            conversationId: normalized.conversationId,
            messageId,
          }, 'Failed to persist WhatsApp inbound message and unread state');
        }
      } else {
        logger.warn('DATABASE_URL is not configured; delivering WhatsApp message without unread persistence');
      }

      emit(io, 'whatsapp:message', {
        ...normalized,
        relationalPersistenceStatus,
      });
      if (unreadCount !== undefined) emitBadgeUpdate(io, normalized.conversationId, unreadCount);
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

export async function sendWhatsAppMessage(jid: string, text: string): Promise<{ messageId?: string }> {
  if (!socket?.user) throw new Error('WhatsApp is not connected.');
  if (!jid.trim() || !text.trim()) throw new Error('WhatsApp JID and message text are required.');
  const result = await socket.sendMessage(jid, { text });
  return { messageId: result?.key?.id || undefined };
}

export async function sendWhatsAppVoice(jid: string, audioDataUrl: string, mimetype = 'audio/webm'): Promise<{ messageId?: string }> {
  if (!socket?.user) throw new Error('WhatsApp is not connected.');
  if (!jid.trim() || !audioDataUrl.startsWith('data:audio/')) throw new Error('WhatsApp JID and valid audio data are required.');
  const encoded = audioDataUrl.slice(audioDataUrl.indexOf(',') + 1);
  const audio = Buffer.from(encoded, 'base64');
  if (!audio.length || audio.length > 8 * 1024 * 1024) throw new Error('Voice message must be between 1 byte and 8 MB.');
  const result = await socket.sendMessage(jid, { audio, mimetype, ptt: true });
  return { messageId: result?.key?.id || undefined };
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
