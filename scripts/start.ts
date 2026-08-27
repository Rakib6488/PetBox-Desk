import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

// Set the runtime mode before dynamically importing auth/config modules so
// production never initializes with the development session-secret fallback.
process.env.NODE_ENV = 'production';

const { dbPool } = await import('../src/server/db');

if (!dbPool) {
  throw new Error('DATABASE_URL is required.');
}

// Render may start a brand-new PostgreSQL database before a pre-deploy
// command has run. Keep startup idempotent so the required tables always
// exist without deleting or overwriting application data.
const schema = await fs.readFile(path.resolve('database/schema.sql'), 'utf8');
await dbPool.query(schema);
console.log('PostgreSQL schema checked.');
await import('./bootstrap-users.ts');

await import('../server.ts');
