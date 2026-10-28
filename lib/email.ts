/**
 * lib/email.ts
 *
 * Sends transactional email through Resend's HTTP API (no SDK needed).
 * Requires RESEND_API_KEY and a verified sending domain for EMAIL_FROM.
 */

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set, skipping "${subject}"`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Yarn it <hello@yarnit.store>",
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    console.error(`[email] Resend ${res.status}: ${await res.text()}`);
    return;
  }
  const { id } = (await res.json()) as { id?: string };
  console.log(`[email] sent "${subject}" (resend id ${id})`);
}
