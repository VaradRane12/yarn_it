export const STORAGE_BUCKET_NAME = "yarnPhotos";

const SUPABASE_STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

export function toStorageProxyUrl(objectPath: string, bucket = STORAGE_BUCKET_NAME) {
  return `/api/storage/${bucket}/${objectPath}`;
}

export function toStorageProxyUrlFromSupabaseUrl(url: string) {
  if (!url.includes(SUPABASE_STORAGE_PUBLIC_PREFIX)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const prefixIndex = parsed.pathname.indexOf(SUPABASE_STORAGE_PUBLIC_PREFIX);
    if (prefixIndex === -1) {
      return url;
    }

    const objectPath = parsed.pathname.slice(prefixIndex + SUPABASE_STORAGE_PUBLIC_PREFIX.length);
    const [bucket, ...pathSegments] = objectPath.split("/").filter(Boolean);

    if (!bucket || pathSegments.length === 0) {
      return url;
    }

    return toStorageProxyUrl(pathSegments.join("/"), bucket);
  } catch {
    return url;
  }
}