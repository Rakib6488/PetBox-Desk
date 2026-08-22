import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

export const dbPool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
    })
  : null;

export const isDatabaseConfigured = Boolean(databaseUrl);

export async function checkDatabaseConnection() {
  if (!dbPool) {
    return { configured: false, connected: false, message: 'DATABASE_URL is not configured.' };
  }

  try {
    await dbPool.query('SELECT 1');
    return { configured: true, connected: true, message: 'PostgreSQL connection is healthy.' };
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      message: error?.message || 'PostgreSQL connection failed.',
    };
  }
}
