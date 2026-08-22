import dotenv from 'dotenv';
import { dbPool } from '../src/server/db';
import {
  INITIAL_USERS,
  INITIAL_PAGES,
  INITIAL_TAGS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_QUICK_RESPONSES,
  INITIAL_SLA_RULES,
  INITIAL_AUDIT_LOGS,
  INITIAL_WAITING_QUEUE,
  INITIAL_CUSTOMER_EMAILS,
} from '../src/data/initialData';

dotenv.config();

if (process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo workspace seeding is disabled. Set ALLOW_DEMO_SEED=true only for local development.');
}

if (!dbPool) throw new Error('DATABASE_URL is required.');

const state = {
  users: INITIAL_USERS,
  pages: INITIAL_PAGES,
  tags: INITIAL_TAGS,
  quickResponses: INITIAL_QUICK_RESPONSES,
  conversations: INITIAL_CONVERSATIONS,
  messages: INITIAL_MESSAGES,
  slaRules: INITIAL_SLA_RULES,
  auditLogs: INITIAL_AUDIT_LOGS,
  waitingQueue: INITIAL_WAITING_QUEUE,
  customerEmails: INITIAL_CUSTOMER_EMAILS,
};

await dbPool.query(
  `INSERT INTO workspace_state (id, state) VALUES ('default', $1::jsonb)
   ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
  [JSON.stringify(state)]
);

await dbPool.end();
console.log('Shared Petbox Desk workspace data seeded.');
