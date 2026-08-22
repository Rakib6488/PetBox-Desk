import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { dbPool } from '../src/server/db';

dotenv.config();

if (!dbPool) {
  throw new Error('DATABASE_URL is required.');
}

// Render may start a brand-new PostgreSQL database before a pre-deploy
// command has run. Keep startup idempotent so the required tables always
// exist without deleting or overwriting application data.
const schema = await fs.readFile(path.resolve('database/schema.sql'), 'utf8');
await dbPool.query(schema);
console.log('PostgreSQL schema checked.');

process.env.NODE_ENV = 'production';
await import('../server.ts');
