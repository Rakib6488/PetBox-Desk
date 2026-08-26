import { Router } from 'express';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { requireAuth, requireRole } from '../auth';
import { getGemini, imapConfig, resendConfig, smtpConfig, smtpTransportConfig } from '../config';
import { dbPool } from '../db';
import type { Server as SocketIOServer } from 'socket.io';

export function createEmailRouter(io: SocketIOServer) {
const emailRouter = Router();
emailRouter.use(requireAuth);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function stableEmailConversationId(email: string): string {
  return `conv_email_${encodeURIComponent(normalizeEmail(email))}`;
}

const EMAIL_EXTERNAL_ACCOUNT_ID = 'default-mailbox';

type PersistEmailInboundArgs = {
  conversationId: string;
  fromEmail: string;
  content: string;
  sourceEmailId: string;
  externalMessageId: string;
  externalConversationKey: string;
  attachments: Array<{ name: string; size: string; type: string; url?: string }>;
  incrementUnread: boolean;
};

async function persistEmailInboundMessage(
  pool: NonNullable<typeof dbPool>,
  args: PersistEmailInboundArgs,
): Promise<{ unreadCount: number; inserted: boolean }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT conversation_key_upsert');

    let conversationResult;

    try {
      conversationResult = await client.query(
        `INSERT INTO conversations
           (id, channel, status, unread_count, updated_at, external_conversation_key)
         VALUES ($1, 'email', 'open', 0, NOW(), $2)
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

      console.warn('Email conversation external-key collision; continuing without claiming key.', {
        conversationId: args.conversationId,
        externalConversationKey: args.externalConversationKey,
        constraint: error?.constraint,
      });

      conversationResult = await client.query(
        `INSERT INTO conversations
           (id, channel, status, unread_count, updated_at)
         VALUES ($1, 'email', 'open', 0, NOW())
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
       VALUES ($1, $2, 'contact', $3, $4, 'text', 'email', $6::jsonb, $5, 'delivered')
       ON CONFLICT (channel, external_message_id) DO NOTHING
       RETURNING id`,
      [
        `email_msg_${args.sourceEmailId}`,
        args.conversationId,
        args.fromEmail,
        args.content,
        args.externalMessageId,
        JSON.stringify(args.attachments),
      ],
    );

    if (messageResult.rowCount && args.incrementUnread) {
      conversationResult = await client.query(
        `UPDATE conversations
         SET unread_count = unread_count + 1,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, unread_count`,
        [args.conversationId],
      );
    }

    await client.query('COMMIT');

    return {
      unreadCount: Number(conversationResult.rows[0]?.unread_count || 0),
      inserted: Boolean(messageResult.rowCount),
    };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  } finally {
    client.release();
  }
}

const SMTP_RETRY_DELAY_MS = 750;
const SMTP_RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'ESOCKET', 'SMTP_ETIMEDOUT']);

function smtpErrorDetails(error: any) {
  return {
    message: error?.message || 'Unknown SMTP error',
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response,
  };
}

function isRetryableSmtpError(error: any) {
  return SMTP_RETRYABLE_CODES.has(error?.code) || [421, 450, 451, 452].includes(error?.responseCode);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

emailRouter.post('/test-connection', async (_req, res) => {
  const smtp = smtpConfig();
  const imap = imapConfig();
  const result = { smtp: { success: false, message: '' }, imap: { success: false, message: '' } };
  if (smtp.host && smtp.auth.user && smtp.auth.pass) {
    const transport = await smtpTransportConfig();
    const transporter = nodemailer.createTransport({ ...transport, tls: { minVersion: 'TLSv1.2', ...(transport.tls || {}) } });
    try { await transporter.verify(); result.smtp = { success: true, message: 'SMTP connection verified.' }; }
    catch (error: any) { console.error('SMTP connection test failed:', smtpErrorDetails(error)); result.smtp.message = error?.message || 'SMTP connection failed.'; }
    finally { transporter.close(); }
  } else result.smtp.message = 'SMTP is not configured.';
  if (imap.host && imap.auth.user && imap.auth.pass) {
    const client = new ImapFlow(imap);
    try { await client.connect(); const box = await client.status('INBOX', { messages: true, unseen: true }); await client.logout(); result.imap = { success: true, message: `IMAP connected. ${box.messages || 0} messages, ${box.unseen || 0} unseen.` }; }
    catch (error: any) { try { await client.logout(); } catch { /* already disconnected */ } result.imap.message = error?.message || 'IMAP connection failed.'; }
  } else result.imap.message = 'IMAP is not configured.';
  res.json(result);
});

emailRouter.post('/send', requireRole('admin', 'supervisor', 'agent'), async (req, res) => {
  const { to, subject, body, html, inReplyTo, references } = req.body || {};
  if (!to || !subject || (!body && !html)) return res.status(400).json({ error: 'to, subject and body/html are required.' });

  const resend = resendConfig();
  if (resend.apiKey && resend.from) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Petbox-Desk/1.0',
        },
        body: JSON.stringify({
          from: resend.from,
          to: [to],
          subject,
          text: body || undefined,
          html: html || undefined,
          headers: {
            ...(inReplyTo ? { 'In-Reply-To': inReplyTo } : {}),
            ...(references ? { References: references } : {}),
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Resend email delivery failed:', {
          status: response.status,
          error: data?.message || data?.error || data,
        });
        return res.status(502).json({ error: data?.message || data?.error || `Resend request failed (${response.status})` });
      }
      return res.json({ success: true, messageId: data?.id, sentAt: new Date().toISOString(), provider: 'resend' });
    } catch (error: any) {
      console.error('Resend email request failed:', { message: error?.message || error, code: error?.code });
      return res.status(502).json({ error: error?.message || 'Resend email request failed.' });
    }
  }

  const smtp = smtpConfig();
  if (!smtp.host || !smtp.auth.user || !smtp.auth.pass) return res.status(503).json({ error: 'SMTP is not configured.' });
  const transport = await smtpTransportConfig();
  const transporter = nodemailer.createTransport({
    ...transport,
    // Gmail requires an App Password when 2-Step Verification is enabled; a normal account password will fail authentication.
    tls: { minVersion: 'TLSv1.2', ...(transport.tls || {}) },
  });
  try {
    const message = {
      from: smtp.from,
      to,
      subject,
      text: body,
      html: html || undefined,
      inReplyTo,
      references,
    };
    let info;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await transporter.verify();
        break;
      } catch (error: any) {
        console.error(`SMTP connection verification attempt ${attempt} failed:`, smtpErrorDetails(error));
        if (attempt === 2 || !isRetryableSmtpError(error)) throw error;
        await wait(SMTP_RETRY_DELAY_MS);
      }
    }
    // Do not retry sendMail after an uncertain network failure: the provider
    // may have accepted the message even when the response was lost.
    info = await transporter.sendMail(message);
    res.json({ success: true, messageId: info?.messageId, sentAt: new Date().toISOString() });
  } catch (error: any) {
    const details = smtpErrorDetails(error);
    console.error('SMTP email delivery failed:', details);
    res.status(502).json({ error: details.message, code: details.code, responseCode: details.responseCode });
  } finally { transporter.close(); }
});

emailRouter.get('/fetch', async (req, res) => {
  const cfg = imapConfig();
  const requestedLimit = Number(req.query.limit || 30);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 30;
  if (!cfg.host || !cfg.auth.user || !cfg.auth.pass) return res.json({ success: false, configured: false, emails: [], message: 'IMAP is not configured.' });
  const client = new ImapFlow(cfg);
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const emails: any[] = [];
    try {
      const box = await client.status('INBOX', { messages: true });
      const total = box.messages || 0;
      if (total) {
        const start = Math.max(1, total - limit + 1);
        for await (const message of client.fetch(`${start}:${total}`, { source: true, flags: true, internalDate: true })) {
          const parsed = await simpleParser(message.source || '');
          const from = parsed.from?.value?.[0];
          const receivedAt = message.internalDate instanceof Date ? message.internalDate.toISOString() : message.internalDate || new Date().toISOString();
          const body = parsed.text || (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
          const headerFingerprint = crypto.createHash('sha256')
            .update([from?.address || '', receivedAt, parsed.subject || '', body.slice(0, 1000)].join('\\n'))
            .digest('hex')
            .slice(0, 32);
          const stableSourceEmailId = message.uid
            ? `imap_uid_${message.uid}`
            : `imap_hash_${headerFingerprint}`;
          const parsedAttachments = (parsed.attachments || []).map((attachment) => ({
            name: attachment.filename || 'attachment',
            size: String(attachment.size || attachment.content?.length || 0),
            type: attachment.contentType || 'application/octet-stream',
            ...(attachment.content?.length <= 5 * 1024 * 1024
              ? { url: `data:${attachment.contentType || 'application/octet-stream'};base64,${attachment.content.toString('base64')}` }
              : {}),
          }));
          const emailRecord = { id: stableSourceEmailId, fromName: from?.name || 'Unknown Customer', fromEmail: from?.address || '', subject: parsed.subject || '(No Subject)', body, preview: body.slice(0, 180), receivedAt, isRead: message.flags?.has('\\Seen') ?? true, isStarred: message.flags?.has('\\Flagged') ?? false, messageId: parsed.messageId || '', references: Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references || '', attachments: parsedAttachments, hasAttachment: parsedAttachments.length > 0 };
          let relationalPersistenceStatus: 'persisted' | 'workspace_only' = 'workspace_only';
          let conversationId = emailRecord.fromEmail
            ? stableEmailConversationId(emailRecord.fromEmail)
            : undefined;

          // Reuse a legacy per-message email conversation when the stable
          // sender-based conversation has not been created yet. This prevents
          // the first post-change email from creating a second visible thread.
          if (dbPool && conversationId && emailRecord.fromEmail) {
            const legacyPrefix = `conv_email_${encodeURIComponent(normalizeEmail(emailRecord.fromEmail))}_%`;
            try {
              const existingConversation = await dbPool.query(
                `SELECT id
                 FROM conversations
                 WHERE channel = 'email' AND (id = $1 OR id LIKE $2)
                 ORDER BY (id = $1) DESC, updated_at DESC
                 LIMIT 1`,
                [conversationId, legacyPrefix],
              );
              conversationId = existingConversation.rows[0]?.id || conversationId;
            } catch (error) {
              console.warn('Unable to locate a legacy email conversation; using the stable sender key.', error);
            }
          }

          if (dbPool && conversationId) {
            try {
              const externalMessageId = emailRecord.messageId || emailRecord.id;
              const externalConversationKey =
                `email:${EMAIL_EXTERNAL_ACCOUNT_ID}:${normalizeEmail(emailRecord.fromEmail)}`;

              const persisted = await persistEmailInboundMessage(dbPool, {
                conversationId,
                fromEmail: emailRecord.fromEmail,
                content: emailRecord.body,
                sourceEmailId: emailRecord.id,
                externalMessageId,
                externalConversationKey,
                attachments: parsedAttachments,
                incrementUnread: !emailRecord.isRead,
              });
              relationalPersistenceStatus = 'persisted';

              if (persisted.inserted && !emailRecord.isRead) {
                io.of('/inbox').emit('badge:update', {
                  channel: 'email',
                  conversationId,
                  unreadCount: persisted.unreadCount,
                });
              }
            } catch (error) {
              console.error('Failed to persist inbound email relational message and unread state:', {
                error: error instanceof Error ? error.message : error,
                conversationId,
                sourceEmailId: emailRecord.id,
              });
            }
          } else if (!dbPool) {
            console.error('DATABASE_URL is not configured; delivering email without unread persistence.');
          }

          emails.push({ ...emailRecord, conversationId, relationalPersistenceStatus });
        }
      }
    } finally { lock.release(); await client.logout(); }
    res.json({ success: true, count: emails.length, emails: emails.reverse() });
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Failed to fetch email.' }); }
});

emailRouter.post('/ai-draft', async (req, res) => {
  const { emailSubject = '', emailBody = '', senderName = 'Customer', category = 'General Query' } = req.body || {};
  try {
    const ai = await getGemini();
    if (!ai) return res.status(503).json({ error: 'Gemini AI is not configured. Add GEMINI_API_KEY before using AI drafts.' });
    const response = await ai.models.generateContent({ model: 'gemini-flash-latest', contents: `Draft a concise professional support email. Sender: ${senderName}. Category: ${category}. Subject: ${emailSubject}. Body: ${emailBody}. Return JSON with draft, summary, priority, recommendedAction.`, config: { responseMimeType: 'application/json' } });
    res.json({ success: true, ...JSON.parse(response.text || '{}') });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Gemini AI draft generation failed.' });
  }
});

return emailRouter;
}
