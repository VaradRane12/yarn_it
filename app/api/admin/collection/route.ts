import { TAGS } from 'lib/constants';
import { sanitizeHtml } from 'lib/sanitize-html';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

const guard = (request: Request) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const header = request.headers.get('x-admin-password');
  if (!adminPassword || header !== adminPassword) {
    return false;
  }
  return true;
};

const getSupabaseEnv = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

function safeRevalidate(tag: string) {
  try {
    revalidateTag(tag, 'seconds');
  } catch {
    // Ignore cache invalidation errors so writes still complete.
  }
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function GET(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json([], { status: 200 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/collections?select=*` , {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    cache: 'no-store',
  });
  const json = await res.json();
  return NextResponse.json(json);
}

export async function POST(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await request.json();
  if (body.description) body.description = sanitizeHtml(body.description);
  const payload = {
    handle: body.handle,
    title: body.title,
    description: body.description || null,
    seo: body.seo || null,
    hidden: body.hidden ?? false,
  };

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/collections`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}

export async function PATCH(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await request.json();
  if (!body.handle) return NextResponse.json({ error: 'Missing handle' }, { status: 400 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/collections?handle=eq.${encodeURIComponent(body.handle)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result: JSON.parse(text) });
}

export async function DELETE(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await request.json();
  if (!body.handle) return NextResponse.json({ error: 'Missing handle' }, { status: 400 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/collections?handle=eq.${encodeURIComponent(body.handle)}`, {
    method: 'DELETE',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=representation' },
  });

  const result = await readJsonResponse(res);
  if (!res.ok) return NextResponse.json({ error: result }, { status: res.status });
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result });
}
