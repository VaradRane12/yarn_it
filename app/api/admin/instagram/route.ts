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
  if (
    !adminPassword ||
    request.headers.get("x-admin-password") !== adminPassword
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const igId = process.env.INSTAGRAM_USER_ID;
  if (!igId || !process.env.INSTAGRAM_ACCESS_TOKEN)
    return NextResponse.json(
      { error: "Instagram not configured" },
      { status: 500 },
    );

  const body = await request.json();
  const caption: string = body.caption || "";
  const imageUrls: string[] = Array.isArray(body.imageUrls)
    ? body.imageUrls
    : [body.imageUrl].filter(Boolean);

  // Instagram fetches each image itself, so they must be absolute and public.
  if (!imageUrls.length || !imageUrls.every((u) => /^https?:\/\//.test(u)))
    return NextResponse.json(
      { error: "Images must be public URLs" },
      { status: 400 },
    );
  if (imageUrls.length > 10)
    return NextResponse.json(
      { error: "Instagram allows at most 10 photos per post" },
      { status: 400 },
    );
  if (caption.length > 2200)
    return NextResponse.json(
      { error: "Caption over 2200 characters" },
      { status: 400 },
    );

  try {
    let creationId: string;
    if (imageUrls.length === 1) {
      creationId = (
        await graph(`${igId}/media`, { image_url: imageUrls[0]!, caption })
      ).id;
    } else {
      const children = await Promise.all(
        imageUrls.map((url) =>
          graph(`${igId}/media`, { image_url: url, is_carousel_item: "true" }),
        ),
      );
      creationId = (
        await graph(`${igId}/media`, {
          media_type: "CAROUSEL",
          children: children.map((c) => c.id).join(","),
          caption,
        })
      ).id;
    }
    // Containers can take a moment to process; retry the publish a few times.
    let post: { id: string } | undefined;
    for (let attempt = 0; !post; attempt++) {
      try {
        post = await graph(`${igId}/media_publish`, {
          creation_id: creationId,
        });
      } catch (e) {
        if (attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    return NextResponse.json({ ok: true, id: post.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
