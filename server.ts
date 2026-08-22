import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PORT } from './src/server/config';
import { checkDatabaseConnection } from './src/server/db';
import { coreRouter } from './src/server/routes/core';
import { emailRouter } from './src/server/routes/email';
import { channelsRouter } from './src/server/routes/channels';

dotenv.config();

const app = express();
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabaseConnection();
  res.json({ status: 'ok', database: database.connected ? 'connected' : 'not_configured', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.use('/api', coreRouter);
app.use('/api/email', emailRouter);
app.use('/api/channels', channelsRouter);

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
  app.listen(PORT, '0.0.0.0', () => console.log(`Petbox Desk server running on http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
