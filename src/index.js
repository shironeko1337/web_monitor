import puppeteer from "@cloudflare/puppeteer";
import { extract, getItemKey, isAvailable, monitor } from "./monitor.js";
import { sendNotification } from "./notifications.js";
import {
  getDashboardData,
  getSetting,
  getSubscriptions,
  recordCheck,
  recordNotification,
  readSeenAvailable,
  setSetting,
  upsertEmailSubscription,
  upsertSeenAvailable
} from "./storage.js";
import { page } from "./ui.js";

const runtime = {
  schedulerEnabled: true,
  runInProgress: false,
  startedAt: new Date().toISOString(),
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  nextRunAt: null,
  lastExitCode: null,
  lastError: null,
  lastOutput: "",
  runCount: 0
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function html(value) {
  return new Response(value, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildEmailMessage(newAvailableItems, monitorConfig) {
  const subject = `[website-watch] ${newAvailableItems.length} new available course date`;
  const lines = [
    `${newAvailableItems.length} new available item(s) were found for ${monitorConfig.name || "monitor"}.`,
    "",
    ...newAvailableItems.flatMap(({ key, item }) => [
      `ID: ${key}`,
      `Availability: ${item.availability || "available"}`,
      `Date: ${item.date || ""}`,
      item.time ? `Time: ${item.time}` : "",
      item.name ? `Course: ${item.name}` : "",
      item.openings == null ? "" : `Openings: ${item.openings}`,
      item.href ? `Link: ${item.href}` : "",
      ""
    ]).filter(Boolean)
  ];
  return {
    subject,
    text: lines.join("\n")
  };
}

async function readAvailability(env) {
  if (!env.BROWSER) {
    throw new Error("Missing BROWSER binding. Enable Cloudflare Browser Rendering for this Worker.");
  }

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const pageHandle = await browser.newPage();
    await pageHandle.goto(env.MONITOR_URL || monitor.url, { waitUntil: "domcontentloaded" });
    await pageHandle.waitForSelector(monitor.readySelector, { timeout: 30000 });
    await pageHandle.waitForTimeout(5000);
    return pageHandle.evaluate((extractSource) => {
      const extractFn = (0, eval)(`(${extractSource})`);
      return extractFn(document);
    }, extract.toString());
  } finally {
    await browser.close();
  }
}

async function analyzeChanges(env, items) {
  const seen = await readSeenAvailable(env, monitor.id);
  const availableItems = items.filter((item) => isAvailable(item));
  const fullItems = items.filter((item) => !isAvailable(item));
  const newAvailableItems = [];

  for (const item of availableItems) {
    const key = getItemKey(item);
    if (!key) continue;
    if (!seen.has(key)) {
      newAvailableItems.push({ key, item });
    }
    await upsertSeenAvailable(env, monitor.id, key, item);
  }

  return {
    total: items.length,
    available: availableItems.length,
    full: fullItems.length,
    newAvailableItems
  };
}

function formatOutput(items, analysis) {
  const lines = [
    `[${new Date().toISOString()}] total=${analysis.total} available=${analysis.available} full=${analysis.full} newAvailable=${analysis.newAvailableItems.length}`
  ];
  for (const item of items) {
    const key = getItemKey(item) || "no-id";
    const marker = isAvailable(item) ? "AVAILABLE" : "not available";
    const name = item.name ? ` | ${item.name}` : "";
    const openings = item.openings == null ? "" : ` | ${item.openings} opening(s)`;
    const keyText = key === item.date ? "" : ` | id=${key}`;
    lines.push(`- ${marker} | ${item.date || ""}${keyText}${openings}${name}`);
  }
  return lines.join("\n");
}

async function notifySubscribers(env, newAvailableItems) {
  if (newAvailableItems.length === 0) return [];

  const subscriptions = (await getSubscriptions(env)).filter((subscription) => subscription.enabled !== 0);
  const message = buildEmailMessage(newAvailableItems, monitor);
  const notifications = [];

  for (const subscription of subscriptions) {
    if (subscription.type !== "email") continue;
    try {
      const result = await sendNotification(env, subscription, message);
      const notification = {
        type: result.type,
        recipient: result.to,
        subject: message.subject,
        itemKeys: newAvailableItems.map(({ key }) => key),
        sentAt: new Date().toISOString(),
        status: result.status
      };
      await recordNotification(env, monitor.id, notification);
      notifications.push(notification);
    } catch (error) {
      const notification = {
        type: subscription.type,
        recipient: subscription.address || "",
        subject: message.subject,
        itemKeys: newAvailableItems.map(({ key }) => key),
        failedAt: new Date().toISOString(),
        error: error.message
      };
      await recordNotification(env, monitor.id, notification);
      notifications.push(notification);
    }
  }

  return notifications;
}

async function runMonitor(env, reason = "manual") {
  if (runtime.runInProgress) {
    return { skipped: true, reason: "run already in progress" };
  }

  runtime.runInProgress = true;
  runtime.lastRunStartedAt = new Date().toISOString();
  runtime.lastRunFinishedAt = null;
  runtime.lastError = null;
  runtime.lastOutput = "";

  try {
    const items = await readAvailability(env);
    const analysis = await analyzeChanges(env, items);
    const output = formatOutput(items, analysis);
    const checkedAt = await recordCheck(env, monitor.id, items, analysis, output);
    await notifySubscribers(env, analysis.newAvailableItems);
    runtime.lastRunFinishedAt = new Date().toISOString();
    runtime.lastExitCode = 0;
    runtime.runCount += 1;
    runtime.lastOutput = output;
    return { skipped: false, reason, checkedAt, analysis, output };
  } catch (error) {
    runtime.lastRunFinishedAt = new Date().toISOString();
    runtime.lastExitCode = 1;
    runtime.lastError = error.message;
    runtime.lastOutput = error.stack || error.message;
    throw error;
  } finally {
    runtime.runInProgress = false;
  }
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/status") {
    return json(await getDashboardData(env, runtime));
  }

  if (request.method === "POST" && url.pathname === "/api/run-once") {
    ctx.waitUntil(runMonitor(env, "manual").catch((error) => {
      runtime.lastError = error.message;
    }));
    return json({ ok: true, message: "monitor run started" }, 202);
  }

  if (request.method === "POST" && url.pathname === "/api/start") {
    runtime.schedulerEnabled = true;
    return json({ ok: true, message: "cloud cron schedule enabled in dashboard state" });
  }

  if (request.method === "POST" && url.pathname === "/api/stop") {
    runtime.schedulerEnabled = false;
    return json({ ok: true, message: "cloud cron runs will be skipped while stopped" });
  }

  if (request.method === "POST" && url.pathname === "/api/config") {
    const updates = await request.json();
    const nextInterval = Number(updates.intervalSeconds);
    if (!Number.isFinite(nextInterval) || nextInterval < 10) {
      return json({ ok: false, message: "intervalSeconds must be at least 10" }, 400);
    }
    const email = String(updates.email || "").trim();
    if (!emailIsValid(email)) {
      return json({ ok: false, message: "A valid email address is required" }, 400);
    }

    await setSetting(env, "intervalSeconds", String(nextInterval));
    await upsertEmailSubscription(env, email);
    return json({ ok: true });
  }

  if (request.method === "POST" && url.pathname === "/api/subscription") {
    const updates = await request.json();
    const email = String(updates.email || "").trim();
    if (!emailIsValid(email)) {
      return json({ ok: false, message: "A valid email address is required" }, 400);
    }
    await upsertEmailSubscription(env, email);
    return json({ ok: true, subscriptions: await getSubscriptions(env) });
  }

  return json({ ok: false, message: "not found" }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, env, ctx);
      }
      return html(page());
    } catch (error) {
      return json({ ok: false, message: error.message }, 500);
    }
  },

  async scheduled(_event, env, ctx) {
    if (!runtime.schedulerEnabled) return;
    const intervalSeconds = Number(await getSetting(env, "intervalSeconds", env.INTERVAL_SECONDS || "80"));
    runtime.nextRunAt = null;
    if (intervalSeconds > 0) {
      ctx.waitUntil(runMonitor(env, "scheduled").catch((error) => {
        runtime.lastError = error.message;
      }));
    }
  }
};
