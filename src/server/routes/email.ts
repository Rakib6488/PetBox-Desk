import { Router } from 'express';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { requireAuth } from '../auth';
import { getGemini, imapConfig, smtpConfig } from '../config';

export const emailRouter = Router();
emailRouter.use(requireAuth);

emailRouter.post('/test-connection', async (_req, res) => {
  const smtp = smtpConfig();
  const imap = imapConfig();
  const result = { smtp: { success: false, message: '' }, imap: { success: false, message: '' } };
  if (smtp.host && smtp.auth.user && smtp.auth.pass) {
    try { await nodemailer.createTransport(smtp).verify(); result.smtp = { success: true, message: 'SMTP connection verified.' }; }
    catch (error: any) { result.smtp.message = error?.message || 'SMTP connection failed.'; }
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
  try {
    const transporter = nodemailer.createTransport({
      ...smtp,
      tls: { minVersion: 'TLSv1.2' },
    });
    await transporter.verify();
    const info = await transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text: body,
      html: html || undefined,
      inReplyTo,
      references,
    });
    res.json({ success: true, messageId: info.messageId, sentAt: new Date().toISOString() });
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Failed to send email.' }); }
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
          emails.push({ id: `imap_${message.uid || message.seq}`, fromName: from?.name || 'Unknown Customer', fromEmail: from?.address || '', subject: parsed.subject || '(No Subject)', body, preview: body.slice(0, 180), receivedAt, isRead: message.flags?.has('\\Seen') ?? true, isStarred: message.flags?.has('\\Flagged') ?? false, messageId: parsed.messageId || '', references: Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references || '' });
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
