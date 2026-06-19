import { EmailMessage } from "cloudflare:email";

function mimeHeader(value) {
  return String(value || "").replace(/[\r\n]/g, " ").trim();
}

function buildMimeMessage(message) {
  const subject = mimeHeader(message.subject);
  const text = String(message.text || "");
  return [
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text
  ].join("\r\n");
}

export async function sendNotification(env, subscription, message) {
  if (!subscription) throw new Error("Missing notification subscription.");
  if (subscription.enabled === false || subscription.enabled === 0) {
    return { skipped: true, reason: "subscription-disabled", type: subscription.type };
  }

  if (subscription.type === "email") {
    const from = env.EMAIL_FROM || "notifications@mail.mskf.work";
    const to = subscription.address;
    if (!to) throw new Error("Missing email recipient.");

    const email = new EmailMessage(
      from,
      to,
      buildMimeMessage(message)
    );
    await env.EMAIL.send(email);
    return { type: "email", to, from, status: "sent" };
  }

  throw new Error(`Unsupported notification type: ${subscription.type || "unknown"}`);
}
