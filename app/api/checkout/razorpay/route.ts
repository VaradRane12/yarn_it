import { markOrderPaid, verifyPaymentSignature } from "lib/razorpay";
import { createCart } from "lib/store";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = b;
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof sig !== "string" ||
    !verifyPaymentSignature(orderId, paymentId, sig)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  await markOrderPaid(orderId, paymentId);
  await createCart(); // fresh empty cart replaces the paid one
  return NextResponse.json({ ok: true });
}
