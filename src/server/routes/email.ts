import { Router } from 'express';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { requireAuth } from '../auth';
import { getGemini, imapConfig, smtpConfig } from '../config';
import { dbPool } from '../db';
import type { Server as SocketIOServer } from 'socket.io';

export function createEmailRouter(io: SocketIOServer) {
const emailRouter = Router();
emailRouter.use(requireAuth);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function stableEmailConversationId(email: string, sourceEmailId: string): string {
  return `conv_email_${encodeURIComponent(normalizeEmail(email))}_${encodeURIComponent(sourceEmailId)}`;
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
    const transporter = nodemailer.createTransport({ ...smtp, tls: { minVersion: 'TLSv1.2' } });
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

emailRouter.post('/send', async (req, res) => {
  const { to, subject, body, html, inReplyTo, references } = req.body || {};
  if (!to || !subject || (!body && !html)) return res.status(400).json({ error: 'to, subject and body/html are required.' });
  const smtp = smtpConfig();
  if (!smtp.host || !smtp.auth.user || !smtp.auth.pass) return res.status(503).json({ error: 'SMTP is not configured.' });
  const transporter = nodemailer.createTransport({
    ...smtp,
    // Gmail requires an App Password when 2-Step Verification is enabled; a normal account password will fail authentication.
    tls: { minVersion: 'TLSv1.2' },
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
          const parsed = await simpleParser(message.source);
          const from = parsed.from?.value?.[0];
          const receivedAt = message.internalDate instanceof Date ? message.internalDate.toISOString() : message.internalDate || new Date().toISOString();
          const body = parsed.text || (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
          const emailRecord = { id: `imap_${message.uid || message.seq}`, fromName: from?.name || 'Unknown Customer', fromEmail: from?.address || '', subject: parsed.subject || '(No Subject)', body, preview: body.slice(0, 180), receivedAt, isRead: message.flags?.has('\\Seen') ?? true, isStarred: message.flags?.has('\\Flagged') ?? false, messageId: parsed.messageId || '', references: Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references || '' };
          const conversationId = emailRecord.fromEmail
            ? stableEmailConversationId(emailRecord.fromEmail, emailRecord.id)
            : undefined;

          if (dbPool && conversationId) {
            try {
              const persisted = await dbPool.query(
                `INSERT INTO conversations
                   (id, channel, status, unread_count, updated_at)
                 VALUES ($1, 'email', 'open', $2, NOW())
                 ON CONFLICT (id) DO NOTHING
                 RETURNING id, unread_count`,
                [conversationId, emailRecord.isRead ? 0 : 1],
              );
              if (persisted.rowCount && !emailRecord.isRead) {
                io.of('/inbox').emit('badge:update', {
                  channel: 'email',
                  conversationId,
                  unreadCount: Number(persisted.rows[0].unread_count),
                });
              }
            } catch (error) {
              console.error('Failed to persist inbound email unread state:', {
                error: error instanceof Error ? error.message : error,
                conversationId,
                sourceEmailId: emailRecord.id,
              });
            }
          } else if (!dbPool) {
            console.error('DATABASE_URL is not configured; delivering email without unread persistence.');
          }

          emails.push({ ...emailRecord, conversationId });
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
