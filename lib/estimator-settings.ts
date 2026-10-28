/**
 * lib/estimator-settings.ts
 *
 * Pricing knobs for the estimator, editable from the admin dashboard.
 * Stored as one JSON file in a private Supabase Storage bucket (no table or
 * migration needed) and sent to the Python estimator with every request.
 */
import { createClient } from "@supabase/supabase-js";
import {
  PRICING_FIELDS,
  type PricingKey,
  type PricingSettings,
} from "lib/estimator-pricing-fields";

export type { PricingSettings };

const BUCKET = "app_settings";
const FILE = "estimator-pricing.json";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

/** Returns a fully valid settings object, or an error naming the bad field. */
export function parsePricingSettings(
  input: unknown,
): { ok: true; value: PricingSettings } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected an object" };
  }
  const value = {} as PricingSettings;
  for (const [key, { label, min, max }] of Object.entries(PRICING_FIELDS)) {
    const n = Number((input as Record<string, unknown>)[key]);
    if (!Number.isFinite(n) || n < min || n > max) {
      return { ok: false, error: `${label} must be between ${min} and ${max}` };
    }
    value[key as PricingKey] = n;
  }
  return { ok: true, value };
}

/** Saved admin overrides, or null when none are saved (estimator uses .env). */
export async function getPricingSettings(): Promise<PricingSettings | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
  if (error || !data) return null;
  try {
    const parsed = parsePricingSettings(JSON.parse(await data.text()));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export async function savePricingSettings(settings: PricingSettings | null) {
  const supabase = client();
  if (!supabase) throw new Error("Supabase is not configured");

  if (settings === null) {
    await supabase.storage.from(BUCKET).remove([FILE]);
    return;
  }

  const body = new Blob([JSON.stringify(settings)], {
    type: "application/json",
  });
  let { error } = await supabase.storage
    .from(BUCKET)
    .upload(FILE, body, { upsert: true, contentType: "application/json" });
  if (error) {
    // First save: the bucket may not exist yet.
    await supabase.storage.createBucket(BUCKET, { public: false });
    ({ error } = await supabase.storage
      .from(BUCKET)
      .upload(FILE, body, { upsert: true, contentType: "application/json" }));
  }
  if (error) throw new Error(error.message);
}
