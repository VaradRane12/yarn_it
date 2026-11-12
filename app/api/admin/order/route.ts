import {
  isMissingOrdersTableError,
  MISSING_ORDERS_TABLE_HINT,
  MISSING_ORDERS_TABLE_MESSAGE,
} from "lib/store/order-errors";
import { isValidEmail, sendEmail } from "lib/email";
import { createRazorpayOrder } from "lib/razorpay";
import { NextResponse } from "next/server";

const guard = (request: Request) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("x-admin-password");
  if (!adminPassword || header !== adminPassword) {
    return false;
  }
  return true;
};

const getSupabaseEnv = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export async function GET(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json([], { status: 200 });

  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders?select=*&order=created_at.desc`,
    {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    },
  );

  const json = await res.json();
  if (!res.ok) {
    if (isMissingOrdersTableError(json)) {
      return NextResponse.json(
        {
          error: MISSING_ORDERS_TABLE_MESSAGE,
          hint: MISSING_ORDERS_TABLE_HINT,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: json }, { status: res.status });
  }
  return NextResponse.json(json);
}

export async function PATCH(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );

  const body = await request.json();
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payload = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    if (isMissingOrdersTableError(text)) {
      return NextResponse.json(
        {
          error: MISSING_ORDERS_TABLE_MESSAGE,
          hint: MISSING_ORDERS_TABLE_HINT,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: text }, { status: res.status });
  }
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}

// Creates a Razorpay order for the remaining balance; returns the pay link to send the customer.
export async function POST(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { id, photo } = await request.json().catch(() => ({}));
  const base = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(id || "")}`;
  const h = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const [order] = await (await fetch(`${base}&select=payment_status,balance_amount,customer_email,guest_email`, { headers: h, cache: "no-store" })).json();
  const due = Number(order?.balance_amount);
  if (!order || !["deposit_paid", "balance_pending"].includes(order.payment_status) || !(due > 0))
    return NextResponse.json({ error: "No balance due" }, { status: 400 });
  const email = String(order.customer_email || order.guest_email || "").trim();
  if (photo && !isValidEmail(email))
    return NextResponse.json({ error: "Order has no customer email" }, { status: 400 });
  const rzp = await createRazorpayOrder(due, id).catch(() => null);
  if (!rzp) return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
  const res = await fetch(base, {
    method: "PATCH",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ payment_status: "balance_pending", payment_reference: rzp.id, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  const origin = new URL(request.url).origin;
  const url = `${origin}/checkout/pay?rzp=${rzp.id}&amount=${due}`;
  // With a photo: email the customer the finished piece and the pay link.
  if (photo) {
    await sendEmail({
      to: email,
      subject: `Your Yarn it order ${id} is ready`,
      replyTo: process.env.NEXT_PUBLIC_OWNER_EMAIL,
      html: `<h2>Your order is ready!</h2><p><img src="${encodeURI(String(photo))}" alt="Your finished order" style="max-width:100%;border-radius:12px"></p><p>Pay the remaining <b>₹${due}</b> and we will ship it.</p><p><a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Pay ₹${due}</a></p>`,
    });
  }
  return NextResponse.json({ url, emailed: !!photo });
}
