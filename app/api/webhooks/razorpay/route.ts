import { markOrderPaid, verifyWebhookSignature } from "lib/razorpay";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature") || "")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const p = event?.payload?.payment?.entity;
  if (event?.event === "payment.captured" && p?.order_id && p?.id) {
    await markOrderPaid(p.order_id, p.id);
  }
  return NextResponse.json({ ok: true });
}
