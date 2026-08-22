import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { dbPool } from '../src/server/db';

dotenv.config();

if (!dbPool) {
  throw new Error('DATABASE_URL is required.');
}

const schema = await fs.readFile(path.resolve('database/schema.sql'), 'utf8');
await dbPool.query(schema);
await dbPool.end();
console.log('PostgreSQL schema initialized.');
