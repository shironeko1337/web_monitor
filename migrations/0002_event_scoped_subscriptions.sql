ALTER TABLE subscriptions ADD COLUMN event_id TEXT NOT NULL DEFAULT 'seattle-active-courses';

UPDATE subscriptions
SET id = 'seattle-active-courses-email',
    event_id = 'seattle-active-courses'
WHERE id = 'default-email';

CREATE INDEX IF NOT EXISTS idx_subscriptions_event_id ON subscriptions(event_id);
