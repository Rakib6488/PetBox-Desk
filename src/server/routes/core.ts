import crypto from 'node:crypto';
import { Router } from 'express';
import { checkDatabaseConnection, dbPool } from '../db';
import { clearSessionCookie, createSessionToken, hashPassword, requireAuth, setSessionCookie, verifyPassword } from '../auth';

export const coreRouter = Router();

coreRouter.get('/db/health', async (_req, res) => {
  const database = await checkDatabaseConnection();
  res.status(database.connected || !database.configured ? 200 : 503).json({
    status: database.connected ? 'ok' : database.configured ? 'error' : 'not_configured',
    database,
  });
});

coreRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const db = await checkDatabaseConnection();
  if (!db.connected || !dbPool) return res.status(503).json({ error: 'Database is not available.' });
  try {
    const result = await dbPool.query(
      'SELECT id, name, email, role, status, avatar, status_started_at AS "statusStartedAt", created_at AS "createdAt", password_hash FROM users WHERE lower(email) = lower($1)',
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password.' });
    const { password_hash: _passwordHash, ...safeUser } = user;
    setSessionCookie(res, createSessionToken(user.id, user.role));
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Login database query failed:', error?.message || error);
    res.status(503).json({ error: 'Database schema is unavailable. Run the database initialization.' });
  }
});

coreRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

coreRouter.get('/auth/me', requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});

coreRouter.post('/admin/users', requireAuth, async (req, res) => {
  if (res.locals.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });

  const { name, email, password, role = 'agent' } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || !['admin', 'supervisor', 'agent', 'bi'].includes(role)) {
    return res.status(400).json({ error: 'Name, email, password and a valid role are required.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const result = await dbPool.query(
      `INSERT INTO users (id, name, email, role, password_hash, status, avatar)
       VALUES ($1, $2, lower($3), $4, $5, 'offline', '')
       RETURNING id, name, email, role, status, avatar, status_started_at AS "statusStartedAt", created_at AS "createdAt"`,
      [`user_${crypto.randomUUID()}`, name.trim(), email.trim(), role, hashPassword(password)]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
    res.status(500).json({ error: 'Unable to create user.' });
  }
});

coreRouter.get('/state', requireAuth, async (_req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const result = await dbPool.query('SELECT state, updated_at AS "updatedAt" FROM workspace_state WHERE id = \'default\'');
  res.json(result.rows[0] || { state: null });
});

coreRouter.put('/state', requireAuth, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'State object is required.' });
  await dbPool.query(
    `INSERT INTO workspace_state (id, state) VALUES ('default', $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [JSON.stringify(req.body)]
  );
  res.json({ success: true });
});

coreRouter.patch('/conversations/:id', requireAuth, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const allowed = ['assigned_agent_id', 'status', 'subject'];
  const updates = Object.entries(req.body || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'No valid conversation fields supplied.' });
  const values = updates.map(([, value]) => value);
  const setClause = updates.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  values.push(req.params.id);
  const result = await dbPool.query(`UPDATE conversations SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`, values);
  if (!result.rowCount) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ success: true });
});

coreRouter.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const { content, messageType = 'text' } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'Message content is required.' });
  const result = await dbPool.query(
    `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, message_type)
     VALUES ($1, $2, 'agent', $3, $4, $5)
     RETURNING id, conversation_id AS "conversationId", sender_type AS "senderType", sender_id AS "senderId", content, message_type AS "messageType", created_at AS "createdAt"`,
    [`msg_${crypto.randomUUID()}`, req.params.id, res.locals.user.id, content.trim(), messageType]
  );
  await dbPool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);
  res.status(201).json({ message: result.rows[0] });
});
