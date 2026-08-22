-- PostgreSQL schema for Petbox Desk CRM
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'agent', 'bi')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  status_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp_jid TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT;

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  assigned_agent_id TEXT REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'live_chat', 'email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'contact', 'system')),
  sender_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_emails (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_customer_emails_status ON customer_emails(status, received_at);

CREATE TABLE IF NOT EXISTS facebook_inbox_events (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  page_id TEXT,
  event_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_events_created ON facebook_inbox_events(created_at DESC);

CREATE TABLE IF NOT EXISTS app_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One shared workspace state is used by both Agent and Admin portals.
-- The legacy app_state table is kept for backward compatibility and migration.
CREATE TABLE IF NOT EXISTS workspace_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace_state (id, state, updated_at)
SELECT 'default', state, updated_at
FROM app_state
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'live_chat', 'email', 'whatsapp')),
  access_token TEXT,
  webhook_verify_token TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0D9488',
  UNIQUE (name, category)
);

CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

CREATE TABLE IF NOT EXISTS quick_responses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  shortcut_key TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sla_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'all',
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  escalate_to_agent_id TEXT REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS waiting_queue (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  page_name TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible channel migration for databases created before WhatsApp support.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_channel_check CHECK (channel IN ('facebook', 'live_chat', 'email', 'whatsapp'));
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_channel_check;
ALTER TABLE pages ADD CONSTRAINT pages_channel_check CHECK (channel IN ('facebook', 'live_chat', 'email', 'whatsapp'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_whatsapp_jid ON contacts(whatsapp_jid) WHERE whatsapp_jid IS NOT NULL;
