import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { dbPool } from '../src/server/db';

dotenv.config();

const [email, name, role = 'agent', password = 'change-me-now'] = process.argv.slice(2);
if (!email || !name || !['admin', 'supervisor', 'agent', 'bi'].includes(role)) {
  throw new Error('Usage: npm run db:create-user -- email name [admin|supervisor|agent] [password]');
}
if (!dbPool) throw new Error('DATABASE_URL is required.');

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const id = `user_${crypto.randomUUID()}`;
await dbPool.query(
  `INSERT INTO users (id, name, email, role, password_hash, status, avatar)
   VALUES ($1, $2, $3, $4, $5, 'offline', '')`,
  [id, name, email.toLowerCase(), role, `scrypt$${salt}$${hash}`]
);
await dbPool.end();
console.log(`Created ${role} user ${email}.`);
