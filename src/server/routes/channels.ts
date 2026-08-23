import crypto from 'node:crypto';
import { Router } from 'express';
import type { Server } from 'socket.io';
import { requireAuth } from '../auth';
import { dbPool } from '../db';

function validFacebookSignature(req: any) {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const signature = String(req.header('x-hub-signature-256') || '');
  if (!signature.startsWith('sha256=') || !req.rawBody) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function resolveFacebookSenderName(senderId: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) return senderId;
  try {
    const version = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(senderId)}?fields=name&access_token=${encodeURIComponent(token)}`);
    const data = await response.json().catch(() => ({}));
    return typeof data.name === 'string' && data.name.trim() ? data.name.trim() : senderId;
  } catch { return senderId; }
}

export function createChannelsRouter(io: Server) {
  const router = Router();
  router.get('/facebook/webhook', (req, res) => {
    if (req.query['hub.verify_token'] !== process.env.FACEBOOK_VERIFY_TOKEN) return res.sendStatus(403);
    res.status(200).send(req.query['hub.challenge']);
  });
  router.post('/facebook/webhook', (req, res) => {
    if (!validFacebookSignature(req)) return res.sendStatus(403);
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    entries.flatMap((entry: any) => Array.isArray(entry.messaging) ? entry.messaging : []).forEach((event: any) => {
      const text = String(event.message?.text || '').trim();
      const senderId = String(event.sender?.id || '');
      if (!text || !senderId || event.message?.is_echo) return;
      const timestamp = Number(event.timestamp || Date.now());
      const eventId = `fb_${senderId}_${timestamp}_${crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)}`;
      const pageId = String(event.recipient?.id || '');
      void (async () => {
        const senderName = await resolveFacebookSenderName(senderId);
        await dbPool?.query('INSERT INTO facebook_inbox_events (id, sender_id, sender_name, content, page_id, event_at) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0)) ON CONFLICT (id) DO NOTHING', [eventId, senderId, senderName, text, pageId, timestamp]);
        io.of('/inbox').emit('facebook:message', { eventId, senderId, senderName, content: text, timestamp, pageId });
      })().catch((error) => console.error('Facebook event persistence failed:', error?.message || error));
    });
    res.sendStatus(200);
  });
  router.use(requireAuth);
  router.get('/facebook/page', async (_req, res) => {
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!accessToken) return res.status(503).json({ error: 'Facebook Page Access Token is not configured.' });
    try {
      const version = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
      const response = await fetch(`https://graph.facebook.com/${version}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error || typeof data.id !== 'string' || typeof data.name !== 'string') {
        return res.status(502).json({ error: data?.error?.message || 'Unable to verify the configured Facebook Page.' });
      }
      res.json({ page: { id: data.id, name: data.name } });
    } catch (error: any) {
      res.status(502).json({ error: error?.message || 'Unable to connect to Facebook.' });
    }
  });
  router.get('/facebook/events', async (_req, res) => {
    if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
    try {
      const result = await dbPool.query('SELECT id AS "eventId", sender_id AS "senderId", sender_name AS "senderName", content, EXTRACT(EPOCH FROM event_at) * 1000 AS timestamp, page_id AS "pageId" FROM facebook_inbox_events WHERE event_at > NOW() - INTERVAL \'7 days\' ORDER BY event_at ASC LIMIT 200');
      res.json({ events: result.rows.map((event) => ({ ...event, timestamp: Number(event.timestamp) })) });
    } catch { res.status(503).json({ error: 'Unable to load Facebook events.' }); }
  });
  router.post('/facebook/send', async (req, res) => {
    const { recipientId, text } = req.body || {};
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!recipientId || !text?.trim()) return res.status(400).json({ error: 'recipientId and text are required.' });
    if (!accessToken) return res.status(503).json({ error: 'Facebook Page Access Token is not configured.' });
    try {
      const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(accessToken)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: { id: recipientId }, message: { text: text.trim() } }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) return res.status(502).json({ error: data?.error?.message || 'Facebook did not accept the message.' });
      res.json({ success: true, messageId: data.message_id });
    } catch (error: any) { res.status(502).json({ error: error?.message || 'Facebook delivery failed.' }); }
  });
  return router;
}
