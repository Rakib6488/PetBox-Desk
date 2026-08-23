import crypto from 'node:crypto';
import dotenv from 'dotenv';
import type { Request, Response, NextFunction } from 'express';
import { dbPool } from './db';

dotenv.config();

const COOKIE_NAME = 'idesk_session';
const DEFAULT_TOKEN_TTL_SECONDS = 8 * 60 * 60;
const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SESSION_SECRET is required in production.'); })() : 'local-development-session-secret');

function sign(value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function createSessionToken(userId: string, role: string, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { userId: string; role: string; exp: number };
    return data.exp > Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function getCookie(req: Request, name: string) {
  const cookies = (req.headers.cookie || '').split(';').map((item) => item.trim());
  return cookies.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = verifySessionToken(getCookie(req, COOKIE_NAME));
    if (!session) return res.status(401).json({ error: 'Authentication required.' });
    if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
    const result = await dbPool.query('SELECT id, name, email, role, status, avatar, created_at AS "createdAt" FROM users WHERE id = $1', [session.userId]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Session user no longer exists.' });
    if (result.rows[0].status === 'disabled') return res.status(403).json({ error: 'This user account is disabled.' });
    res.locals.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication middleware failed:', error);
    res.status(503).json({ error: 'Authentication service is unavailable.' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const role = res.locals.user?.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: role === 'bi' ? 'BI accounts have read-only access.' : 'You do not have permission to perform this action.' });
    }
    next();
  };
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const configuredOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  const allowed = !origin || configuredOrigins.includes(origin) || origin === requestOrigin;
  if (!allowed) {
    return res.status(403).json({ error: 'Cross-origin request blocked.' });
  }
  next();
}

export function setSessionCookie(res: Response, token: string, maxAgeSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

export function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
