import { baseUrl } from "lib/utils";
import { NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v23.0";

const graph = async (path: string, params: Record<string, string>) => {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    body: new URLSearchParams({
      ...params,
      access_token: process.env.INSTAGRAM_ACCESS_TOKEN!,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Instagram error");
  return json as { id: string };
};

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || request.headers.get("x-admin-password") !== adminPassword)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igId = process.env.INSTAGRAM_USER_ID;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!igId || !process.env.INSTAGRAM_ACCESS_TOKEN || !supabaseUrl || !supabaseKey)
    return NextResponse.json({ error: "Instagram not configured" }, { status: 500 });

  const { id } = await request.json();
  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=title,handle,description,featured_image,price_range`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
  );
  const product = (await res.json())?.[0];
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const imageUrl: string = product.featured_image?.url || "";
  // Instagram fetches the image itself, so it must be absolute and public.
  if (!imageUrl.startsWith("http"))
    return NextResponse.json({ error: "Product image is not a public URL" }, { status: 400 });

  const price = product.price_range?.minVariantPrice?.amount;
  const caption = [
    product.title,
    product.description,
    price ? `₹${Number(price).toFixed(0)}` : "",
    `${baseUrl}/product/${product.handle}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const container = await graph(`${igId}/media`, { image_url: imageUrl, caption });
    // The container can take a moment to process; retry the publish once.
    const publish = () => graph(`${igId}/media_publish`, { creation_id: container.id });
    const post = await publish().catch(async () => {
      await new Promise((r) => setTimeout(r, 3000));
      return publish();
    });
    return NextResponse.json({ ok: true, id: post.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
