/**
 * lib/estimate-email.ts
 *
 * Branded HTML for estimate emails. Email clients ignore <style> and modern
 * CSS, so this is table layout with inline styles only.
 */
import { baseUrl } from "lib/utils";

export type EstimateResult = {
  description?: string;
  dimensions?: string;
  keywords?: string;
  hours_low?: number;
  hours_high?: number;
  suggested_price_low?: number;
  suggested_price_high?: number;
};

const INK = "#1d1028";
const CREAM = "#fff4e4";
const DISPLAY =
  "Impact, 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif";
const BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`;

// The vision model replies "Object: X\nCraft: Y\n…"; turn that into rows.
function parseDescription(description = "") {
  return description
    .split("\n")
    .map((line) => line.split(/:\s*/))
    .filter(([key, ...rest]) => key && rest.join(":").trim())
    .map(([key, ...rest]) => [key!.trim(), rest.join(":").trim()] as const);
}

export function estimateTitle(result: EstimateResult) {
  const object = parseDescription(result.description).find(
    ([k]) => k.toLowerCase() === "object",
  );
  return object?.[1] || "your crochet piece";
}

export function estimateEmailHtml({
  result,
  imageUrl,
  customerEmail,
  notes = "",
  forOwner,
}: {
  result: EstimateResult;
  imageUrl: string | null;
  customerEmail: string;
  notes?: string;
  forOwner: boolean;
}) {
  const title = estimateTitle(result);
  const price =
    result.suggested_price_low && result.suggested_price_high
      ? `${inr(result.suggested_price_low)} – ${inr(result.suggested_price_high)}`
      : "We'll confirm by email";
  const hours =
    result.hours_low && result.hours_high
      ? `${result.hours_low}–${result.hours_high} hours of crochet`
      : "";
  const rows = parseDescription(result.description)
    .filter(([k]) => k.toLowerCase() !== "object")
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:2px solid #f1e6d3;font:700 12px ${BODY};text-transform:uppercase;letter-spacing:1.5px;color:${INK};width:40%;">${esc(k)}</td>
          <td style="padding:8px 0;border-bottom:2px solid #f1e6d3;font:15px ${BODY};color:${INK};">${esc(v)}</td>
        </tr>`,
    )
    .join("");

  const intro = forOwner
    ? `New estimate from <a href="mailto:${esc(customerEmail)}" style="color:${INK};font-weight:700;">${esc(customerEmail || "an anonymous visitor")}</a>. Hit reply to talk to them.`
    : "Thanks for sending us your idea! Here's our quick estimate. Like it? Just reply to this email and we'll start crocheting.";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yarn it</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 20px;font:44px ${DISPLAY};letter-spacing:1px;text-transform:uppercase;color:${INK};">Yarn it <span style="font-size:28px;">🧶</span></td></tr>
        <tr><td style="background:#ffffff;border:3px solid ${INK};border-radius:28px;box-shadow:6px 6px 0 ${INK};overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#b9a2ff;border-bottom:3px solid ${INK};padding:14px 28px;font:700 12px ${BODY};letter-spacing:3px;text-transform:uppercase;color:${INK};">✺ ${forOwner ? "New estimate" : "Your quote"}</td></tr>
            <tr><td style="padding:28px 28px 8px;font:16px/1.5 ${BODY};color:${INK};">${intro}</td></tr>
            <tr><td style="padding:8px 28px 0;font:36px/1.05 ${DISPLAY};text-transform:uppercase;color:${INK};">${esc(title)}</td></tr>
            ${
              imageUrl
                ? `<tr><td style="padding:20px 28px 0;"><img src="${esc(imageUrl)}" alt="Your photo" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:3px solid ${INK};border-radius:20px;" /></td></tr>`
                : ""
            }
            ${
              notes
                ? `<tr><td style="padding:20px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#74e4b5;border:3px solid ${INK};border-radius:20px;"><tr><td style="padding:16px 20px;font:15px/1.5 ${BODY};color:${INK};"><div style="font:700 12px ${BODY};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">✎ ${forOwner ? "Their note" : "Your note"}</div>${esc(notes).replace(/\r?\n/g, "<br/>")}</td></tr></table></td></tr>`
                : ""
            }
            <tr><td style="padding:20px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffd94f;border:3px solid ${INK};border-radius:20px;">
                <tr><td align="center" style="padding:22px 16px 6px;font:700 12px ${BODY};letter-spacing:2px;text-transform:uppercase;color:${INK};">Estimated price</td></tr>
                <tr><td align="center" style="padding:0 16px;font:44px/1.1 ${DISPLAY};color:${INK};">${esc(price)}</td></tr>
                <tr><td align="center" style="padding:6px 16px 22px;font:14px ${BODY};color:${INK};">${esc(hours)}${result.dimensions ? ` · ${esc(result.dimensions)}` : ""}</td></tr>
              </table>
            </td></tr>
            ${rows ? `<tr><td style="padding:24px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
            <tr><td align="center" style="padding:28px;">
              <a href="${forOwner ? `mailto:${esc(customerEmail)}` : `${baseUrl}/search`}" style="display:inline-block;background:#ff6f4f;border:3px solid ${INK};border-radius:999px;padding:14px 28px;font:20px ${DISPLAY};text-transform:uppercase;letter-spacing:1px;color:${INK};text-decoration:none;">${forOwner ? "Reply to customer" : "Browse the shop"}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 8px;font:12px/1.5 ${BODY};color:${INK};opacity:.7;">
          ${forOwner ? `Keywords: ${esc(result.keywords)}` : "This is an automatic estimate. Final price can change once we see the details."}<br/>
          <a href="${baseUrl}" style="color:${INK};">yarnit.store</a> · Crocheted by hand, one loop at a time.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
