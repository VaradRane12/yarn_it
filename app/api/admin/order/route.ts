import { isMissingOrdersTableError, MISSING_ORDERS_TABLE_HINT, MISSING_ORDERS_TABLE_MESSAGE } from "lib/store/order-errors";
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
  if (!guard(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json([], { status: 200 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders?select=*&order=created_at.desc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    if (isMissingOrdersTableError(json)) {
      return NextResponse.json(
        { error: MISSING_ORDERS_TABLE_MESSAGE, hint: MISSING_ORDERS_TABLE_HINT },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: json }, { status: res.status });
  }
  return NextResponse.json(json);
}

export async function PATCH(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payload = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    if (isMissingOrdersTableError(text)) {
      return NextResponse.json(
        { error: MISSING_ORDERS_TABLE_MESSAGE, hint: MISSING_ORDERS_TABLE_HINT },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: text }, { status: res.status });
  }
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}
