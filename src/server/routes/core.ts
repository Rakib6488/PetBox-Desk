import crypto from 'node:crypto';
import { Router } from 'express';
import type { Server } from 'socket.io';
import { checkDatabaseConnection, dbPool } from '../db';
import { clearSessionCookie, createSessionToken, hashPassword, requireAuth, requireRole, setSessionCookie, verifyPassword } from '../auth';

const validUserRoles = ['admin', 'supervisor', 'agent', 'bi'] as const;
const loginFailures = new Map<string, { count: number; resetAt: number }>();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginFailures = 5;

function mergeAgentWorkspaceState(previous: Record<string, any>, incoming: Record<string, any>, userId: string) {
  const allowedConversationFields = [
    'status', 'sentiment', 'tags', 'lastMessageAt', 'lastMessageText', 'unreadCount',
    'isBookmarked', 'pausedReason', 'pausedAt', 'pausedBy', 'resolvedAt', 'closedByAgentId',
    'notes', 'summary', 'firstResponseAt', 'landedAt', 'slaDueAt', 'priority', 'slaBreach',
  ];
  const previousConversations = Array.isArray(previous.conversations) ? previous.conversations : [];
  const incomingConversations = Array.isArray(incoming.conversations) ? incoming.conversations : [];
  const conversations = previousConversations.map((conversation: any) => {
    const candidate = incomingConversations.find((item: any) => item?.id === conversation?.id);
    const canClaimUnassigned = !conversation?.assignedAgentId && candidate?.assignedAgentId === userId;
    const assignedToAgent = conversation?.assignedAgentId === userId || canClaimUnassigned;
    if (!candidate || !assignedToAgent) return conversation;
    const updated = { ...conversation };
    for (const field of allowedConversationFields) {
      if (candidate[field] !== undefined) updated[field] = candidate[field];
    }
    return updated;
  });
  const previousMessages = Array.isArray(previous.messages) ? previous.messages : [];
  const knownMessageIds = new Set(previousMessages.map((message: any) => message?.id));
  const ownNewMessages = (Array.isArray(incoming.messages) ? incoming.messages : []).filter(
    (message: any) => message?.id && !knownMessageIds.has(message.id) && message.senderType === 'agent' && message.senderId === userId,
  );

  const previousEmails = Array.isArray(previous.customerEmails) ? previous.customerEmails : [];
  const incomingEmails = Array.isArray(incoming.customerEmails) ? incoming.customerEmails : [];
  const customerEmails = previousEmails.map((email: any) => {
    const candidate = incomingEmails.find((item: any) => item?.id === email?.id);
    if (!candidate) return email;
    return {
      ...email,
      ...(candidate.isRead !== undefined ? { isRead: candidate.isRead } : {}),
      ...(candidate.isStarred !== undefined ? { isStarred: candidate.isStarred } : {}),
      ...(candidate.status !== undefined ? { status: candidate.status } : {}),
      ...(candidate.assignedAgentName !== undefined ? { assignedAgentName: candidate.assignedAgentName } : {}),
    };
  });

  const previousQueue = Array.isArray(previous.waitingQueue) ? previous.waitingQueue : [];
  const incomingQueueIds = new Set((Array.isArray(incoming.waitingQueue) ? incoming.waitingQueue : []).map((item: any) => item?.id));
  const waitingQueue = previousQueue.filter((item: any) => incomingQueueIds.has(item?.id));
  const previousAuditLogs = Array.isArray(previous.auditLogs) ? previous.auditLogs : [];
  const knownAuditIds = new Set(previousAuditLogs.map((entry: any) => entry?.id));
  const ownNewAuditLogs = (Array.isArray(incoming.auditLogs) ? incoming.auditLogs : []).filter(
    (entry: any) => entry?.id && !knownAuditIds.has(entry.id) && entry.userId === userId,
  );

  return {
    ...previous,
    conversations,
    messages: [...previousMessages, ...ownNewMessages],
    customerEmails,
    waitingQueue,
    auditLogs: [...ownNewAuditLogs, ...previousAuditLogs],
  };
}

type PersistAgentReplyArgs = {
  conversationId: string;
  channel: 'email' | 'whatsapp';
  senderId: string;
  content: string;
  messageType: string;
  attachments: unknown[] | null;
  externalMessageId: string | null;
  externalConversationKey: string | null;
};

async function persistAgentReply(
  pool: NonNullable<typeof dbPool>,
  args: PersistAgentReplyArgs,
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT conversation_key_upsert');

    try {
      await client.query(
        `INSERT INTO conversations
           (id, channel, status, subject, external_conversation_key)
         VALUES ($1, $2, 'open', '', $3)
         ON CONFLICT (id) DO UPDATE
         SET external_conversation_key = COALESCE(
           conversations.external_conversation_key,
           EXCLUDED.external_conversation_key
         ),
         updated_at = NOW()`,
        [args.conversationId, args.channel, args.externalConversationKey],
      );

      await client.query('RELEASE SAVEPOINT conversation_key_upsert');
    } catch (error: any) {
      const isExternalKeyCollision =
        error?.code === '23505'
        && String(error?.constraint || '').includes('idx_conversations_external_key');

      if (!isExternalKeyCollision) throw error;

      await client.query('ROLLBACK TO SAVEPOINT conversation_key_upsert');
      console.warn('Agent reply external conversation-key collision; continuing without claiming key.', {
        conversationId: args.conversationId,
        channel: args.channel,
        externalConversationKey: args.externalConversationKey,
        constraint: error?.constraint,
      });

      await client.query(
        `INSERT INTO conversations (id, channel, status, subject)
         VALUES ($1, $2, 'open', '')
         ON CONFLICT (id) DO NOTHING`,
        [args.conversationId, args.channel],
      );
      await client.query('RELEASE SAVEPOINT conversation_key_upsert');
    }

    let messageResult = await client.query(
      `INSERT INTO messages (
         id,
         conversation_id,
         sender_type,
         sender_id,
         content,
         message_type,
         channel,
         attachments,
         external_message_id,
         status
       )
       VALUES ($1, $2, 'agent', $3, $4, $5, $6, $7::jsonb, $8, 'sent')
       ON CONFLICT (channel, external_message_id) DO NOTHING
       RETURNING
         id,
         conversation_id AS "conversationId",
         sender_type AS "senderType",
         sender_id AS "senderId",
         content,
         message_type AS "messageType",
         channel,
         attachments,
         external_message_id AS "externalMessageId",
         status,
         created_at AS "createdAt"`,
      [
        `msg_${crypto.randomUUID()}`,
        args.conversationId,
        args.senderId,
        args.content,
        args.messageType,
        args.channel,
        args.attachments ? JSON.stringify(args.attachments) : null,
        args.externalMessageId,
      ],
    );

    if (!messageResult.rowCount && args.externalMessageId) {
      const existing = await client.query(
        `SELECT
           id,
           conversation_id AS "conversationId",
           sender_type AS "senderType",
           sender_id AS "senderId",
           content,
           message_type AS "messageType",
           channel,
           attachments,
           external_message_id AS "externalMessageId",
           status,
           created_at AS "createdAt"
         FROM messages
         WHERE channel = $1 AND external_message_id = $2`,
        [args.channel, args.externalMessageId],
      );

      if (existing.rows[0]?.conversationId !== args.conversationId) {
        throw new Error('Provider message ID belongs to another conversation.');
      }
      messageResult = existing;
    }

    const conversationResult = await client.query(
      `UPDATE conversations
       SET unread_count = 0,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, channel, unread_count`,
      [args.conversationId],
    );

    await client.query('COMMIT');

    return {
      message: messageResult.rows[0],
      conversation: conversationResult.rows[0],
    };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  } finally {
    client.release();
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginFailures) if (value.resetAt <= now) loginFailures.delete(key);
}, loginWindowMs).unref();

export function createCoreRouter(io: Server) {
const coreRouter = Router();

coreRouter.get('/db/health', requireAuth, requireRole('admin', 'supervisor'), async (_req, res) => {
  const database = await checkDatabaseConnection();
  res.status(database.connected || !database.configured ? 200 : 503).json({
    status: database.connected ? 'ok' : database.configured ? 'error' : 'not_configured',
    database,
  });
});

coreRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const rememberMe = Boolean(req.body?.rememberMe);
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const attemptKey = `${req.ip}:${String(email).trim().toLowerCase()}`;
  const attempt = loginFailures.get(attemptKey);
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= maxLoginFailures) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  const db = await checkDatabaseConnection();
  if (!db.connected || !dbPool) return res.status(503).json({ error: 'Database is not available.' });
  try {
    const result = await dbPool.query(
      'SELECT id, name, email, role, status, avatar, status_started_at AS "statusStartedAt", created_at AS "createdAt", password_hash FROM users WHERE lower(email) = lower($1)',
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      const current = loginFailures.get(attemptKey);
      const next = current && current.resetAt > Date.now() ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: Date.now() + loginWindowMs };
      loginFailures.set(attemptKey, next);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    loginFailures.delete(attemptKey);
    const { password_hash: _passwordHash, ...safeUser } = user;
    const sessionTtl = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
    setSessionCookie(res, createSessionToken(user.id, user.role, sessionTtl), sessionTtl);
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

// Kept as a compatibility endpoint for older clients. Both portals receive
// the same authenticated workspace snapshot from the shared PostgreSQL row.
coreRouter.get('/bootstrap', requireAuth, async (_req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    const result = await dbPool.query('SELECT state, version, updated_at AS "updatedAt" FROM workspace_state WHERE id = \'default\'');
    res.json(result.rows[0] || { state: null });
  } catch (error) {
    console.error('Bootstrap load failed:', error);
    res.status(503).json({ error: 'Unable to load workspace state.' });
  }
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

coreRouter.patch('/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });

  const body = req.body || {};
  const updates: Array<[string, string]> = [];
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
    updates.push(['name', body.name.trim()]);
  }
  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !body.email.trim()) return res.status(400).json({ error: 'Email cannot be empty.' });
    updates.push(['email', body.email.trim().toLowerCase()]);
  }
  if (body.role !== undefined) {
    if (!validUserRoles.includes(body.role)) return res.status(400).json({ error: 'A valid role is required.' });
    updates.push(['role', body.role]);
  }
  if (!updates.length) return res.status(400).json({ error: 'Name, email or role is required.' });

  try {
    const targetResult = await dbPool.query('SELECT id, role, status FROM users WHERE id = $1', [req.params.id]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const nextRole = updates.find(([key]) => key === 'role')?.[1];
    if (target.role === 'admin' && target.status !== 'disabled' && nextRole && nextRole !== 'admin') {
      const otherAdminResult = await dbPool.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'admin' AND status <> 'disabled' AND id <> $1`,
        [target.id]
      );
      if (otherAdminResult.rows[0].count === 0) {
        return res.status(409).json({ error: 'At least one active admin must remain.' });
      }
    }

    const values = updates.map(([, value]) => value);
    values.push(req.params.id);
    const setClause = updates.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const result = await dbPool.query(
      `UPDATE users SET ${setClause}
       WHERE id = $${values.length}
       RETURNING id, name, email, role, status, avatar, status_started_at AS "statusStartedAt", created_at AS "createdAt"`,
      values
    );
    res.json({ user: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
    console.error('User update failed:', error);
    res.status(503).json({ error: 'Unable to update user.' });
  }
});

coreRouter.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const requestedStatus = req.body?.status;
  if (requestedStatus !== 'active' && requestedStatus !== 'disabled') {
    return res.status(400).json({ error: 'Status must be active or disabled.' });
  }

  try {
    const targetResult = await dbPool.query('SELECT id, role, status FROM users WHERE id = $1', [req.params.id]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (requestedStatus === 'disabled' && target.id === res.locals.user.id) {
      return res.status(409).json({ error: 'You cannot disable your own account.' });
    }
    if (requestedStatus === 'disabled' && target.role === 'admin' && target.status !== 'disabled') {
      const otherAdminResult = await dbPool.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'admin' AND status <> 'disabled' AND id <> $1`,
        [target.id]
      );
      if (otherAdminResult.rows[0].count === 0) {
        return res.status(409).json({ error: 'At least one active admin must remain.' });
      }
    }

    const databaseStatus = requestedStatus === 'disabled' ? 'disabled' : 'offline';
    const result = await dbPool.query(
      `UPDATE users SET status = $1, status_started_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, status, avatar, status_started_at AS "statusStartedAt", created_at AS "createdAt"`,
      [databaseStatus, req.params.id]
    );
    res.json({ user: result.rows[0], status: result.rows[0].status });
  } catch (error) {
    console.error('User status update failed:', error);
    res.status(503).json({ error: 'Unable to update user status.' });
  }
});

coreRouter.get('/state', requireAuth, async (_req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    const result = await dbPool.query('SELECT state, version, updated_at AS "updatedAt" FROM workspace_state WHERE id = \'default\'');
    res.json(result.rows[0] || { state: null });
  } catch (error) {
    console.error('State load failed:', error);
    res.status(503).json({ error: 'Unable to load workspace state.' });
  }
});

coreRouter.put('/state', requireAuth, requireRole('admin', 'supervisor', 'agent'), async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'State object is required.' });
  if (JSON.stringify(req.body).length > 12_000_000) return res.status(413).json({ error: 'State payload is too large.' });
  const requestedVersion = req.body.version === undefined ? 0 : Number(req.body.version);
  if (!Number.isInteger(requestedVersion) || requestedVersion < 0) return res.status(400).json({ error: 'A valid workspace state version is required.' });
  try {
    await dbPool.query(`INSERT INTO workspace_state (id, state, version) VALUES ('default', '{}'::jsonb, 0) ON CONFLICT (id) DO NOTHING`);
    const current = await dbPool.query('SELECT state FROM workspace_state WHERE id = \'default\'');
    const previous = current.rows[0]?.state || {};
    const { version: _version, ...incoming } = req.body as Record<string, unknown>;
    const protectedKeys = ['users', 'pages', 'tags', 'quickResponses', 'slaRules', 'emailSettings', 'landingLimit', 'auditLogs'];
    const state = res.locals.user.role === 'agent'
      ? mergeAgentWorkspaceState(previous, incoming, res.locals.user.id)
      : { ...previous, ...incoming } as Record<string, unknown>;
    if (res.locals.user.role !== 'admin') {
      for (const key of protectedKeys) state[key] = previous[key];
    }
    const result = await dbPool.query(
      `UPDATE workspace_state
       SET state = $1::jsonb, version = version + 1, updated_at = NOW()
       WHERE id = 'default' AND version = $2
       RETURNING version`,
      [JSON.stringify(state), requestedVersion]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Workspace changed elsewhere. Reload the latest state before saving again.', code: 'WORKSPACE_STATE_CONFLICT' });
    res.json({ success: true, version: result.rows[0].version });
  } catch (error) {
    console.error('State save failed:', error);
    res.status(503).json({ error: 'Unable to save workspace state.' });
  }
});

coreRouter.patch('/conversations/:id', requireAuth, requireRole('admin', 'supervisor', 'agent'), async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const allowed = ['assigned_agent_id', 'status', 'subject'];
  const updates = Object.entries(req.body || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'No valid conversation fields supplied.' });
  const values = updates.map(([, value]) => value);
  const setClause = updates.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  values.push(req.params.id);
  try {
    const result = await dbPool.query(`UPDATE conversations SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Conversation not found.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Conversation update failed:', error);
    res.status(503).json({ error: 'Unable to update conversation.' });
  }
});

coreRouter.post('/conversations/:id/read', requireAuth, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    const result = await dbPool.query(
      `UPDATE conversations
       SET unread_count = 0, updated_at = NOW()
       WHERE id = $1
       RETURNING id, channel, unread_count`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Conversation not found.' });
    const conversation = result.rows[0];
    io.of('/inbox').emit('badge:update', {
      channel: conversation.channel,
      conversationId: conversation.id,
      unreadCount: Number(conversation.unread_count),
    });
    if (conversation.channel === 'whatsapp') {
      io.of('/whatsapp').emit('badge:update', {
        channel: conversation.channel,
        conversationId: conversation.id,
        unreadCount: Number(conversation.unread_count),
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Conversation read update failed:', error);
    res.status(503).json({ error: 'Unable to mark conversation as read.' });
  }
});

coreRouter.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  try {
    const result = await dbPool.query(
      `SELECT
         id,
         conversation_id AS "conversationId",
         sender_type AS "senderType",
         sender_id AS "senderId",
         content,
         message_type AS "messageType",
         attachments,
         external_message_id AS "externalMessageId",
         created_at AS "createdAt"
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 500`,
      [req.params.id],
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Relational message load failed:', error);
    res.status(503).json({ error: 'Unable to load relational messages.' });
  }
});

coreRouter.post('/conversations/:id/messages', requireAuth, requireRole('admin', 'supervisor', 'agent'), async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'Database is not configured.' });
  const {
    content,
    messageType = 'text',
    channel = 'live_chat',
    attachments,
    externalMessageId,
    externalConversationKey,
  } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Message content is required.' });
  if (content.length > 10000) return res.status(413).json({ error: 'Message content is too large.' });
  if (!['text', 'image', 'file', 'audio', 'product_card'].includes(messageType)) return res.status(400).json({ error: 'Unsupported message type.' });
  const safeChannel = ['facebook', 'live_chat', 'email', 'whatsapp'].includes(channel) ? channel : 'live_chat';
  const relationalChannel = safeChannel === 'email' || safeChannel === 'whatsapp';
  const safeAttachments = Array.isArray(attachments) ? attachments : null;
  const safeExternalMessageId = typeof externalMessageId === 'string' && externalMessageId.trim()
    ? externalMessageId.trim()
    : null;
  const safeExternalConversationKey = typeof externalConversationKey === 'string' && externalConversationKey.trim()
    ? externalConversationKey.trim()
    : null;
  try {
    if (relationalChannel) {
      const persisted = await persistAgentReply(dbPool, {
        conversationId: req.params.id,
        channel: safeChannel as 'email' | 'whatsapp',
        senderId: res.locals.user.id,
        content: content.trim(),
        messageType,
        attachments: safeAttachments,
        externalMessageId: safeExternalMessageId,
        externalConversationKey: safeExternalConversationKey,
      });

      const conversation = persisted.conversation;
      if (conversation) {
        io.of('/inbox').emit('badge:update', {
          channel: conversation.channel,
          conversationId: conversation.id,
          unreadCount: Number(conversation.unread_count),
        });
        if (conversation.channel === 'whatsapp') {
          io.of('/whatsapp').emit('badge:update', {
            channel: conversation.channel,
            conversationId: conversation.id,
            unreadCount: Number(conversation.unread_count),
          });
        }
      }

      return res.status(201).json({ message: persisted.message });
    }

    {
      await dbPool.query(
        `INSERT INTO conversations (id, channel, status, subject)
         VALUES ($1, $2, 'open', '')
         ON CONFLICT (id) DO NOTHING`,
        [req.params.id, safeChannel],
      );
    }
    const result = await dbPool.query(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, message_type)
       VALUES ($1, $2, 'agent', $3, $4, $5)
       RETURNING id, conversation_id AS "conversationId", sender_type AS "senderType", sender_id AS "senderId", content, message_type AS "messageType", created_at AS "createdAt"`,
      [`msg_${crypto.randomUUID()}`, req.params.id, res.locals.user.id, content.trim(), messageType],
    );
    const conversationUpdate = await dbPool.query(
      `UPDATE conversations
       SET unread_count = CASE WHEN $2 IN ('facebook', 'whatsapp', 'email') THEN 0 ELSE unread_count END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, channel, unread_count`,
      [req.params.id, safeChannel]
    );
    if (conversationUpdate.rowCount) {
      const conversation = conversationUpdate.rows[0];
      io.of('/inbox').emit('badge:update', {
        channel: conversation.channel,
        conversationId: conversation.id,
        unreadCount: Number(conversation.unread_count),
      });
      if (conversation.channel === 'whatsapp') {
        io.of('/whatsapp').emit('badge:update', {
          channel: conversation.channel,
          conversationId: conversation.id,
          unreadCount: Number(conversation.unread_count),
        });
      }
    }
    res.status(201).json({ message: result.rows[0] });
  } catch (error: any) {
    console.error('Message persistence failed:', error?.message || error);
    res.status(503).json({ error: 'Unable to save the message.' });
  }
});

return coreRouter;
}
