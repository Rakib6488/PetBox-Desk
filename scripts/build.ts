import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

await viteBuild({
  root: projectRoot,
  configFile: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': projectRoot } },
});

console.log('Petbox Desk frontend production build completed. Start the TypeScript server with `npm start`.');
