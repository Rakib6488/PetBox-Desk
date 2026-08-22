import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import {
  clearWhatsAppAuthSession,
  getWhatsAppStatus,
  logoutWhatsAppConnection,
  sendWhatsAppMessage,
  startWhatsAppConnection,
} from './connection.js';

export function createWhatsAppRouter(io: SocketIOServer) {
  const router = Router();

  router.use((req, res, next) => {
    if ((req.method === 'POST' && (req.path === '/connect' || req.path === '/disconnect')) && res.locals.user?.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Admin access required for WhatsApp connection management.' });
      return;
    }
    next();
  });

  router.get('/status', (_req, res) => {
    res.json(getWhatsAppStatus());
  });

  router.post('/connect', async (_req, res) => {
    try {
      await startWhatsAppConnection(io);
      res.json({ ok: true, ...getWhatsAppStatus() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unable to connect WhatsApp.' });
    }
  });

  router.post('/disconnect', async (_req, res) => {
    try {
      await logoutWhatsAppConnection();
      await clearWhatsAppAuthSession();
      res.json({ ok: true, connected: false });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unable to disconnect WhatsApp.' });
    }
  });

  router.post('/send', async (req, res) => {
    const jid = typeof req.body?.jid === 'string' ? req.body.jid : '';
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    if (!jid.trim() || !text.trim()) {
      res.status(400).json({ ok: false, error: 'jid and text are required.' });
      return;
    }

    try {
      await sendWhatsAppMessage(jid, text);
      res.json({ ok: true });
    } catch (error) {
      res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'Unable to send WhatsApp message.' });
    }
  });

  return router;
}
