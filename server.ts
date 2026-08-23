import path from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PORT } from './src/server/config';
import { checkDatabaseConnection, dbPool } from './src/server/db';
import { coreRouter } from './src/server/routes/core';
import { emailRouter } from './src/server/routes/email';
import { createChannelsRouter } from './src/server/routes/channels';
import { requireAuth, requireSameOrigin, verifySessionToken } from './src/server/auth';
import { Server as SocketIOServer } from 'socket.io';
import { createWhatsAppRouter } from './server/src/whatsapp/routes';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const httpServer = createHttpServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const configuredOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
      const localOrigins = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, 'http://localhost:3002', 'http://localhost:5173'];
      if (!origin || [...configuredOrigins, ...localOrigins].includes(origin)) return callback(null, true);
      callback(new Error('Socket origin not allowed'));
    },
    credentials: true,
  },
});
io.of('/whatsapp').use(async (socket, next) => {
  const cookie = socket.handshake.headers.cookie || '';
  const token = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('idesk_session='))?.slice('idesk_session='.length);
  const session = verifySessionToken(token);
  if (!session || !dbPool) return next(new Error('Authentication required.'));
  try {
    const result = await dbPool.query('SELECT status FROM users WHERE id = $1', [session.userId]);
    if (!result.rows[0] || result.rows[0].status === 'disabled') return next(new Error('Authentication required.'));
    next();
  } catch {
    next(new Error('Authentication service unavailable.'));
  }
});
io.of('/inbox').use(async (socket, next) => {
  const cookie = socket.handshake.headers.cookie || '';
  const token = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('idesk_session='))?.slice('idesk_session='.length);
  const session = verifySessionToken(token);
  if (!session || !dbPool) return next(new Error('Authentication required.'));
  try {
    const result = await dbPool.query('SELECT status FROM users WHERE id = $1', [session.userId]);
    if (!result.rows[0] || result.rows[0].status === 'disabled') return next(new Error('Authentication required.'));
    next();
  } catch { next(new Error('Authentication service unavailable.')); }
});
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '15mb', verify: (req, _res, buffer) => { (req as any).rawBody = buffer; } }));
app.use(requireSameOrigin);

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabaseConnection();
  res.json({ status: 'ok', database: database.connected ? 'connected' : 'not_configured', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.use('/api', coreRouter);
app.use('/api/email', emailRouter);
app.use('/api/channels', createChannelsRouter(io));
// The standalone WhatsApp package has its own Express type tree; runtime uses
// the same Express instance, so narrow the cross-package router at this boundary.
app.use('/api/whatsapp', requireAuth, createWhatsAppRouter(io) as any);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: projectRoot, configFile: false, plugins: [react(), tailwindcss()],
      cacheDir: path.join(process.env.TEMP || projectRoot, 'petbox-desk-vite-cache'),
      server: { middlewareMode: true, hmr: false }, appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(projectRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Petbox Desk server running on http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
