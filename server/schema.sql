CREATE TABLE IF NOT EXISTS app_visitors (
  ip_address TEXT PRIMARY KEY,
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
