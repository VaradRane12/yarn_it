import { DEFAULT_CURRENCY_CODE, TAGS } from 'lib/constants';
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

function createMoney(amount: number, currencyCode = DEFAULT_CURRENCY_CODE) {
  return {
    amount: amount.toFixed(2),
    currencyCode,
  };
}

function normalizePriceRange(priceRange: unknown, variants: any[] = []) {
  if (
    priceRange &&
    typeof priceRange === 'object' &&
    'minVariantPrice' in priceRange &&
    'maxVariantPrice' in priceRange
  ) {
    const range = priceRange as {
      minVariantPrice?: { amount?: string | number };
      maxVariantPrice?: { amount?: string | number };
    };
    const min = Number(range.minVariantPrice?.amount ?? 0);
    const max = Number(range.maxVariantPrice?.amount ?? 0);
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;

    return {
      minVariantPrice: createMoney(safeMin, DEFAULT_CURRENCY_CODE),
      maxVariantPrice: createMoney(safeMax, DEFAULT_CURRENCY_CODE),
    };
  }

  if (typeof priceRange === 'number' || typeof priceRange === 'string') {
    const amount = Number(priceRange);
    if (Number.isFinite(amount)) {
      const currencyCode = variants?.[0]?.price?.currencyCode || DEFAULT_CURRENCY_CODE;
      return {
        minVariantPrice: createMoney(amount, currencyCode),
        maxVariantPrice: createMoney(amount, currencyCode),
      };
    }
  }

  const variantPrices = variants
    .map((variant) => Number(variant?.price?.amount || 0))
    .filter((value) => Number.isFinite(value));
  const currencyCode = variants?.[0]?.price?.currencyCode || DEFAULT_CURRENCY_CODE;
  const amount = variantPrices.length > 0 ? Number(variantPrices[0]) : 0;
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return {
    minVariantPrice: createMoney(safeAmount, currencyCode),
    maxVariantPrice: createMoney(safeAmount, currencyCode),
  };
}

function normalizeDescriptionHtml(description: unknown) {
  const text = typeof description === 'string' ? description : '';
  if (!text) return '';
  return `<p>${text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`;
}

function normalizeVariants(variants: any[] | undefined, priceRange: any, title: string, availableForSale: boolean) {
  if (variants?.length) {
    return variants.map((variant) => ({
      ...variant,
      price: {
        ...(variant?.price || {}),
        amount: variant?.price?.amount ?? priceRange.maxVariantPrice.amount,
        currencyCode: DEFAULT_CURRENCY_CODE,
      },
    }));
  }

  return [
    {
      id: crypto.randomUUID(),
      title: 'Default Title',
      availableForSale,
      selectedOptions: [],
      price: priceRange.maxVariantPrice,
    },
  ];
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

function safeRevalidate(tag: string) {
  try {
    revalidateTag(tag, 'seconds');
  } catch {
    // Ignore cache invalidation errors so write operations still succeed.
  }
}

export async function GET(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json([], { status: 200 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=*` , {
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
  const firstImage = body.images?.[0] || body.featured_image || {
    url: `/catalog/${body.handle || 'product'}.svg`,
    altText: body.title || 'Product image',
    width: 1200,
    height: 1200,
  };
  const priceRange = normalizePriceRange(body.price_range, body.variants || []);
  const payload = {
    id: body.id || crypto.randomUUID(),
    handle: body.handle,
    title: body.title,
    description: body.description ? sanitizeHtml(body.description) : null,
    description_html: body.description_html ? sanitizeHtml(body.description_html) : normalizeDescriptionHtml(body.description),
    available_for_sale: body.available_for_sale ?? true,
    options: body.options || null,
    price_range: priceRange,
    variants: normalizeVariants(body.variants, priceRange, body.title, body.available_for_sale ?? true),
    featured_image: firstImage,
    images: body.images?.length ? body.images : [firstImage],
    seo: body.seo || null,
    tags: body.tags || null,
    collection_handles: body.collection_handles || null,
    recommendation_ids: body.recommendation_ids || null,
    sales_rank: body.sales_rank || null,
  };

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/products`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const result = await readJsonResponse(res);
  if (!res.ok) return NextResponse.json({ error: result }, { status: res.status });
  safeRevalidate(TAGS.products);
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result });
}

export async function PATCH(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await request.json();
  if (body.description) body.description = sanitizeHtml(body.description);
  if (body.description_html) body.description_html = sanitizeHtml(body.description_html);
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  const result = await readJsonResponse(res);
  if (!res.ok) return NextResponse.json({ error: result }, { status: res.status });
  safeRevalidate(TAGS.products);
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result });
}

export async function DELETE(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'DELETE',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=representation' },
  });

  const result = await readJsonResponse(res);
  if (!res.ok) return NextResponse.json({ error: result }, { status: res.status });
  safeRevalidate(TAGS.products);
  safeRevalidate(TAGS.collections);
  return NextResponse.json({ success: true, result });
}
