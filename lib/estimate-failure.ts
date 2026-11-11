/**
 * lib/estimate-failure.ts
 *
 * Customers only ever see GENERIC_ESTIMATE_ERROR. The real details go to the
 * server log and to the owner by email.
 */
import { isValidEmail, sendEmail } from "lib/email";

export const GENERIC_ESTIMATE_ERROR =
  "A server error occurred. Please check back later.";

export type FailureContext = {
  step: string;
  error: string;
  jobId?: string;
  dimensions?: string;
  notes?: string;
  customerEmail?: string;
  image?: { name: string; type: string; size: number; base64?: string };
  models?: { vision?: string; text?: string };
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function reportEstimateFailure(ctx: FailureContext) {
  console.error(
    `[estimate] FAILED at step "${ctx.step}" (job ${ctx.jobId ?? "n/a"}): ${ctx.error}`,
  );
  const owner = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").trim();
  if (!isValidEmail(owner)) return;

  const m = ctx.models;
  const rows: [string, string][] = [
    [
      "Time",
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
    ],
    ["Failed step", ctx.step],
    ["Job id", ctx.jobId ?? "n/a"],
    ["Customer email", ctx.customerEmail || "n/a"],
    ["Size text", ctx.dimensions || "n/a"],
    ["Anything else?", ctx.notes || "n/a"],
    [
      "Image",
      ctx.image
        ? `${ctx.image.name} · ${ctx.image.type || "unknown type"} · ${(ctx.image.size / 1024).toFixed(0)} KB`
        : "n/a",
    ],
    [
      "Models",
      m
        ? `vision: ${m.vision ?? "?"}, text: ${m.text ?? "?"}`
        : "n/a (estimator unreachable)",
    ],
  ];
  const html =
    `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">` +
    rows
      .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`)
      .join("") +
    `</table><p><b>Full error</b></p><pre style="white-space:pre-wrap">${esc(ctx.error)}</pre>`;

  try {
    await sendEmail({
      to: owner,
      subject: `Estimator failed at ${ctx.step}`,
      html,
      attachments: ctx.image?.base64
        ? [
            {
              filename: ctx.image.name || "photo.jpg",
              content: ctx.image.base64,
            },
          ]
        : undefined,
    });
  } catch (err) {
    console.error("[estimate] failure email threw:", err);
  }
}
