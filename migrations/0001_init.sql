PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  profile_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_user_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_device_id TEXT,
  provider TEXT NOT NULL DEFAULT 'guest',
  prompt TEXT NOT NULL,
  normalized_prompt_hash TEXT,
  status TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  size TEXT,
  quality TEXT,
  model TEXT,
  result_r2_key TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  queued_at INTEGER,
  started_at INTEGER,
  finished_at INTEGER,
  cancelled_at INTEGER,
  metadata_json TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_jobs_active_user
ON jobs(user_id)
WHERE status IN ('queued', 'running') AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS queue_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  old_rank INTEGER,
  new_rank INTEGER,
  message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  group_name TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS secret_settings (
  key TEXT PRIMARY KEY,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
  masked_value TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_value_masked TEXT,
  new_value_masked TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_limits (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(scope, scope_key, bucket_start)
);

CREATE TABLE IF NOT EXISTS bans (
  id TEXT PRIMARY KEY,
  ban_type TEXT NOT NULL,
  ban_value TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(ban_type, ban_value)
);

INSERT OR IGNORE INTO app_settings(key, value, value_type, group_name, description, is_public, updated_at)
VALUES
('APP_NAME', 'Edge-Fast-Image-Queue', 'string', 'general', 'Site name', 1, unixepoch()),
('OPENAI_BASE_URL', 'https://api.openai.com/v1', 'string', 'image', 'OpenAI compatible API base URL', 0, unixepoch()),
('OPENAI_IMAGE_MODEL', 'gpt-image-2', 'string', 'image', 'Default image model', 1, unixepoch()),
('OPENAI_IMAGE_SIZE', '1024x1024', 'string', 'image', 'Default image size', 1, unixepoch()),
('OPENAI_IMAGE_QUALITY', 'auto', 'string', 'image', 'Default image quality', 1, unixepoch()),
('QUEUE_CONCURRENCY', '2', 'number', 'queue', 'Concurrent running jobs', 0, unixepoch()),
('QUEUE_GROUP_WINDOW_SECONDS', '60', 'number', 'queue', 'Rate limit window seconds', 0, unixepoch()),
('QUEUE_GROUP_MAX_REQUESTS', '1', 'number', 'queue', 'Max submit requests per window', 0, unixepoch()),
('QUEUE_PRIORITY_TRIGGER_LENGTH', '100', 'number', 'queue', 'Enable priority insertion when queue length exceeds this value', 0, unixepoch()),
('QUEUE_PROTECTED_RANK', '50', 'number', 'queue', 'Top N protected FIFO ranks', 1, unixepoch()),
('QUEUE_PRIORITY_INSERT_START', '51', 'number', 'queue', 'Priority insert starts from this rank', 1, unixepoch()),
('QUEUE_ALLOW_GUEST', 'false', 'boolean', 'queue', 'Allow guest generation', 1, unixepoch()),
('GOOGLE_OAUTH_ENABLED', 'false', 'boolean', 'auth', 'Enable Google login', 1, unixepoch()),
('LINUXDO_OAUTH_ENABLED', 'false', 'boolean', 'auth', 'Enable Linux.DO login', 1, unixepoch()),
('ADSENSE_ENABLED', 'false', 'boolean', 'ads', 'Enable Google AdSense', 1, unixepoch());
