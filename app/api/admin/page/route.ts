import { sanitizeHtml } from "lib/sanitize-html";
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
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/pages?select=*`,
    {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    },
  );
  const json = await res.json();
  return NextResponse.json(json);
}

export async function POST(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );

  const body = await request.json();
  if (body.body) body.body = sanitizeHtml(body.body);
  const payload = {
    id: body.id || crypto.randomUUID(),
    title: body.title,
    handle: body.handle,
    body: body.body || null,
    body_summary: body.bodySummary || null,
    seo: body.seo || null,
  };

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/pages`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok)
    return NextResponse.json({ error: text }, { status: res.status });
  return NextResponse.json({ success: true, result: JSON.parse(text) });
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

  const payload = { ...body };
  if (payload.bodySummary !== undefined && payload.body_summary === undefined) {
    payload.body_summary = payload.bodySummary;
  }
  delete payload.bodySummary;

  if (payload.body) payload.body = sanitizeHtml(payload.body);

  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/pages?id=eq.${encodeURIComponent(body.id)}`,
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
  if (!res.ok)
    return NextResponse.json({ error: text }, { status: res.status });
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}

export async function DELETE(request: Request) {
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

  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/pages?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=representation",
      },
    },
  );

  const text = await res.text();
  if (!res.ok)
    return NextResponse.json({ error: text }, { status: res.status });
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}
