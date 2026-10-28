import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidEmail, sendEmail } from "lib/email";
import type { Cart } from "lib/store/types";

const API = "https://api.razorpay.com/v1";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function hmac(data: string | Buffer, secret: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  return !!secret && safeEqual(hmac(`${orderId}|${paymentId}`, secret), signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return !!secret && safeEqual(hmac(rawBody, secret), signature);
}

export async function createRazorpayOrder(amountRupees: number, receipt: string) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt,
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${await res.text()}`);
  return (await res.json()) as { id: string };
}

function supabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url: `${url}/rest/v1`, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/**
 * Flips the order to paid and emails the owner. Idempotent: the filter only
 * matches an order that is not yet paid, so verify route and webhook can both
 * call it and the email goes out once. payment_reference holds the Razorpay
 * order id until paid, then the payment id.
 */
export async function markOrderPaid(rzpOrderId: string, paymentId: string) {
  const { url, headers } = supabase();
  const res = await fetch(
    `${url}/orders?payment_reference=eq.${encodeURIComponent(rzpOrderId)}&payment_status=neq.paid`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        payment_status: "paid",
        payment_reference: paymentId,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) throw new Error(`markOrderPaid failed: ${await res.text()}`);
  const [order] = (await res.json()) as Record<string, any>[];
  if (!order) return;

  const cart = order.cart_snapshot as Cart | undefined;
  const items = (cart?.lines || [])
    .map(
      (l: any) =>
        `<li>${esc(l.quantity)} × ${esc(l.merchandise?.product?.title)}${l.merchandise?.title && l.merchandise.title !== "Default Title" ? ` (${esc(l.merchandise.title)})` : ""}</li>`,
    )
    .join("");
  const addr = [
    order.shipping_name,
    order.shipping_line1,
    order.shipping_line2,
    `${order.shipping_city || ""}${order.shipping_state ? `, ${order.shipping_state}` : ""} ${order.shipping_postal_code || ""}`,
    order.shipping_country,
    order.shipping_phone,
  ]
    .filter(Boolean)
    .map(esc)
    .join("<br>");
  const owner = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").trim();
  const customer = String(order.customer_email || order.guest_email || "").trim();
  const body = `<p><b>${esc(order.id)}</b> · ₹${esc(order.total_amount)} · payment ${esc(paymentId)}</p><ul>${items}</ul><p>${addr}</p>`;
  const mails = [];
  if (isValidEmail(owner))
    mails.push(
      sendEmail({
        to: owner,
        subject: `New paid order ${order.id}: ₹${order.total_amount}`,
        replyTo: isValidEmail(customer) ? customer : undefined,
        html: `<h2>New paid order</h2>${body}<p>Customer: ${esc(customer || "no email")}</p>`,
      }),
    );
  else console.warn("[razorpay] NEXT_PUBLIC_OWNER_EMAIL missing/malformed, no owner email");
  if (isValidEmail(customer))
    mails.push(
      sendEmail({
        to: customer,
        subject: `Your Yarn it order ${order.id}`,
        replyTo: isValidEmail(owner) ? owner : undefined,
        html: `<h2>Thanks for your order!</h2><p>We've received your payment and will start on your order soon.</p>${body}`,
      }),
    );
  // Emails must never fail the payment confirmation.
  (await Promise.allSettled(mails)).forEach((r) => {
    if (r.status === "rejected") console.error("[razorpay] email failed", r.reason);
  });
}
