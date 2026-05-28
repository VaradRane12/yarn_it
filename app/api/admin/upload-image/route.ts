import { STORAGE_BUCKET_NAME } from "lib/storage-images";
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

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  if (!guard(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "products");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || "image");
  const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const uploadResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${STORAGE_BUCKET_NAME}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    },
  );

  const text = await uploadResponse.text();
  if (!uploadResponse.ok) {
    return NextResponse.json(
      { error: `Upload failed (${uploadResponse.status}): ${text}` },
      { status: uploadResponse.status },
    );
  }

    const url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET_NAME}/${objectPath}`;

  return NextResponse.json({
    success: true,
    url,
    path: objectPath,
    bucket: STORAGE_BUCKET_NAME,
    name: file.name,
  });
}
