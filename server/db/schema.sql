CREATE TABLE IF NOT EXISTS admin_devices (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activation_tokens (
  id UUID PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  created_by_device_id UUID REFERENCES admin_devices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES admin_devices(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_sessions_active_idx ON admin_sessions(token_hash, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS activation_tokens_active_idx ON activation_tokens(token_hash, used_at, expires_at);
