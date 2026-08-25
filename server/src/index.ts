import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createWhatsAppRouter } from './whatsapp/routes.js';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 10000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const apiKey = process.env.WHATSAPP_API_KEY;
if (!apiKey) throw new Error('WHATSAPP_API_KEY is required when running the standalone WhatsApp server.');
const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

function requireWhatsAppKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.header('X-WhatsApp-Api-Key') !== apiKey) return res.status(401).json({ error: 'WhatsApp authentication required.' });
  res.locals.user = { role: 'admin' };
  next();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const io = new SocketIOServer(httpServer, {
  cors: { origin: clientOrigin, credentials: true },
});

app.use('/api/whatsapp', requireWhatsAppKey, createWhatsAppRouter(io));
io.of('/whatsapp').use((socket, next) => {
  if (socket.handshake.auth?.apiKey !== apiKey) return next(new Error('WhatsApp authentication required.'));
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

httpServer.listen(port, host, () => {
  console.log(`WhatsApp backend listening on http://${host}:${port}`);
});
