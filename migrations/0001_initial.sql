CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  total INTEGER NOT NULL,
  available INTEGER NOT NULL,
  full INTEGER NOT NULL,
  new_available_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  output TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS seen_available (
  event_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  item_json TEXT NOT NULL,
  PRIMARY KEY (event_id, item_key)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  item_keys_json TEXT NOT NULL,
  sent_at TEXT,
  failed_at TEXT,
  status TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_checks_event_checked_at ON checks(event_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id, id DESC);

INSERT OR IGNORE INTO subscriptions (id, type, enabled, address)
VALUES ('default-email', 'email', 1, 'shironeko1052@gmail.com');
