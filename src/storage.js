export const HISTORY_DAYS = 7;

export async function getSetting(env, key, fallback) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row?.value ?? fallback;
}

export async function setSetting(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind(key, String(value), new Date().toISOString()).run();
}

export async function getSubscriptions(env) {
  const result = await env.DB.prepare(
    "SELECT id, type, enabled, address FROM subscriptions ORDER BY created_at"
  ).all();
  return result.results || [];
}

export async function upsertEmailSubscription(env, email) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO subscriptions (id, type, enabled, address, created_at, updated_at) VALUES (?, 'email', 1, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET enabled = 1, address = excluded.address, updated_at = excluded.updated_at"
  ).bind("default-email", email, now, now).run();
}

export async function readSeenAvailable(env, eventId) {
  const result = await env.DB.prepare(
    "SELECT item_key, item_json FROM seen_available WHERE event_id = ?"
  ).bind(eventId).all();
  const seen = new Map();
  for (const row of result.results || []) {
    seen.set(row.item_key, JSON.parse(row.item_json));
  }
  return seen;
}

export async function upsertSeenAvailable(env, eventId, itemKey, item) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO seen_available (event_id, item_key, first_seen_at, last_seen_at, item_json) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(event_id, item_key) DO UPDATE SET last_seen_at = excluded.last_seen_at, item_json = excluded.item_json"
  ).bind(eventId, itemKey, now, now, JSON.stringify(item)).run();
}

export async function recordCheck(env, eventId, items, analysis, output) {
  const checkedAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO checks (event_id, checked_at, total, available, full, new_available_json, items_json, output) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    eventId,
    checkedAt,
    analysis.total,
    analysis.available,
    analysis.full,
    JSON.stringify(analysis.newAvailableItems),
    JSON.stringify(items),
    output || ""
  ).run();
  await pruneHistory(env, eventId);
  return checkedAt;
}

export async function recordNotification(env, eventId, notification) {
  await env.DB.prepare(
    "INSERT INTO notifications (event_id, type, recipient, subject, item_keys_json, sent_at, failed_at, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    eventId,
    notification.type,
    notification.recipient,
    notification.subject,
    JSON.stringify(notification.itemKeys || []),
    notification.sentAt || null,
    notification.failedAt || null,
    notification.status || null,
    notification.error || null
  ).run();
}

export async function pruneHistory(env, eventId) {
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM checks WHERE event_id = ? AND checked_at < ?").bind(eventId, cutoff).run();
}

export async function getDashboardData(env, runtime) {
  const eventId = "seattle-active-courses";
  const intervalSeconds = Number(await getSetting(env, "intervalSeconds", env.INTERVAL_SECONDS || "80"));
  const subscriptions = await getSubscriptions(env);
  const historyResult = await env.DB.prepare(
    "SELECT checked_at, total, available, full, new_available_json, items_json, output FROM checks WHERE event_id = ? ORDER BY checked_at DESC LIMIT 50"
  ).bind(eventId).all();
  const notificationResult = await env.DB.prepare(
    "SELECT type, recipient, subject, item_keys_json, sent_at, failed_at, status, error FROM notifications WHERE event_id = ? ORDER BY id DESC LIMIT 20"
  ).bind(eventId).all();
  const resultHistory = (historyResult.results || []).map((row) => ({
    checkedAt: row.checked_at,
    total: row.total,
    available: row.available,
    full: row.full,
    newAvailable: JSON.parse(row.new_available_json || "[]"),
    items: JSON.parse(row.items_json || "[]"),
    output: row.output || ""
  }));
  const lastCheck = resultHistory[0] || null;

  return {
    runtime,
    config: {
      intervalSeconds,
      monitorScript: "cloudflare-worker",
      stateFile: "D1:website_watch",
      subscriptionsFile: "D1:subscriptions"
    },
    scheduleEvents: [{
      id: eventId,
      name: env.MONITOR_NAME || "Seattle ActiveCommunities courses",
      intervalSeconds,
      schedulerEnabled: runtime.schedulerEnabled,
      runInProgress: runtime.runInProgress,
      lastRunStartedAt: runtime.lastRunStartedAt,
      lastRunFinishedAt: runtime.lastRunFinishedAt,
      nextRunAt: runtime.nextRunAt,
      lastExitCode: runtime.lastExitCode,
      lastError: runtime.lastError,
      latestResult: lastCheck ? {
        checkedAt: lastCheck.checkedAt,
        total: lastCheck.total,
        available: lastCheck.available,
        full: lastCheck.full,
        newAvailable: lastCheck.newAvailable.length
      } : null
    }],
    lastCheck,
    resultHistory,
    notifications: (notificationResult.results || []).map((row) => ({
      type: row.type,
      to: row.recipient,
      subject: row.subject,
      itemKeys: JSON.parse(row.item_keys_json || "[]"),
      sentAt: row.sent_at,
      failedAt: row.failed_at,
      status: row.status,
      error: row.error
    })),
    subscriptions
  };
}
