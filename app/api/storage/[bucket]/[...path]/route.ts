import { STORAGE_BUCKET_NAME } from "lib/storage-images";
import { NextRequest, NextResponse } from "next/server";

const getSupabaseEnv = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

async function fetchStorageObject(bucket: string, objectPath: string) {
  const { supabaseUrl } = getSupabaseEnv();
  if (!supabaseUrl) {
    return null;
  }

  const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;

  const publicResponse = await fetch(publicUrl, {
    cache: "no-store",
  });

  if (publicResponse.ok && publicResponse.body) {
    return publicResponse;
  }

  return null;
}

async function handleRequest(
  _request: NextRequest,
  context: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path } = await context.params;

  if (bucket !== STORAGE_BUCKET_NAME) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const objectPath = path.join("/");
  if (!objectPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const response = await fetchStorageObject(bucket, objectPath);
  if (!response) {
    return NextResponse.json({ error: "Failed to load storage object" }, { status: 500 });
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  return handleRequest(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  return handleRequest(request, context);
}