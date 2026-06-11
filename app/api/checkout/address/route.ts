import { getCart } from "lib/store";
import {
  isMissingOrdersTableError,
  MISSING_ORDERS_TABLE_HINT,
  MISSING_ORDERS_TABLE_MESSAGE,
} from "lib/store/order-errors";
import { NextResponse } from "next/server";

function getSupabaseEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim() || null;
  const email = String(form.get("email") || "").trim() || null;
  const line1 = String(form.get("line1") || "").trim();
  const line2 = String(form.get("line2") || "").trim() || null;
  const city = String(form.get("city") || "").trim();
  const state = String(form.get("state") || "").trim() || null;
  const postalCode = String(form.get("postalCode") || "").trim();
  const country = String(form.get("country") || "").trim();
  const phone = String(form.get("phone") || "").trim() || null;

  if (!line1 || !city || !postalCode || !country) {
    return NextResponse.json(
      { error: "Please provide a valid address." },
      { status: 400 },
    );
  }

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const cart = await getCart();
  if (!cart) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, "")}`;
  const payload = {
    id: orderId,
    status: "pending",
    payment_method: "upi",
    payment_status: "pending",
    currency_code: cart.cost.totalAmount.currencyCode,
    total_amount: Number(cart.cost.totalAmount.amount),
    customer_email: email || null,
    guest_email: email || null,
    cart_snapshot: cart,
    shipping_name: name,
    shipping_line1: line1,
    shipping_line2: line2,
    shipping_city: city,
    shipping_state: state,
    shipping_postal_code: postalCode,
    shipping_country: country,
    shipping_phone: phone,
  };

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Supabase orders insert failed:", body);

      // Detect missing orders table (common when DB migrations not applied)
      if (isMissingOrdersTableError(body)) {
        return NextResponse.json(
          {
            error: MISSING_ORDERS_TABLE_MESSAGE,
            hint: MISSING_ORDERS_TABLE_HINT,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: body }, { status: res.status });
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    
    const redirectUrl = new URL(`/upi-checkout`, baseUrl);
    redirectUrl.searchParams.set(
      "amount",
      String(cart.cost.totalAmount.amount),
    );
    redirectUrl.searchParams.set(
      "currency",
      cart.cost.totalAmount.currencyCode,
    );
    redirectUrl.searchParams.set("orderId", orderId);

    const output = NextResponse.redirect(redirectUrl);
    // set cookies for address so subsequent flows can reuse
    output.cookies.set("shippingName", name || "", {
      path: "/",
      sameSite: "lax",
    });
    output.cookies.set("shippingLine1", line1, { path: "/", sameSite: "lax" });
    if (line2)
      output.cookies.set("shippingLine2", line2, {
        path: "/",
        sameSite: "lax",
      });
    output.cookies.set("shippingCity", city, { path: "/", sameSite: "lax" });
    if (state)
      output.cookies.set("shippingState", state, {
        path: "/",
        sameSite: "lax",
      });
    output.cookies.set("shippingPostalCode", postalCode, {
      path: "/",
      sameSite: "lax",
    });
    output.cookies.set("shippingCountry", country, {
      path: "/",
      sameSite: "lax",
    });
    if (phone)
      output.cookies.set("shippingPhone", phone, {
        path: "/",
        sameSite: "lax",
      });
    if (email)
      output.cookies.set("customerEmail", email, {
        path: "/",
        sameSite: "lax",
      });
    if (name)
      output.cookies.set("customerName", name, { path: "/", sameSite: "lax" });

    return output;
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
