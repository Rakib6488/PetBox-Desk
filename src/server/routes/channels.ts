import { Router } from 'express';
import { requireAuth } from '../auth';

export const channelsRouter = Router();
channelsRouter.use(requireAuth);

channelsRouter.post('/facebook/send', async (req, res) => {
  const { recipientId, text } = req.body || {};
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!recipientId || !text?.trim()) return res.status(400).json({ error: 'recipientId and text are required.' });
  if (!accessToken) return res.status(503).json({ error: 'Facebook Page Access Token is not configured.' });

  try {
    const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: text.trim() } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) return res.status(502).json({ error: data?.error?.message || 'Facebook did not accept the message.' });
    res.json({ success: true, messageId: data.message_id });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Facebook delivery failed.' });
  }
});
