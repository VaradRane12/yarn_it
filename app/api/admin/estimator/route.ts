import {
  getPricingSettings,
  parsePricingSettings,
  savePricingSettings,
} from "lib/estimator-settings";
import { NextResponse } from "next/server";

const ESTIMATOR_URL =
  process.env.ESTIMATOR_API_URL ||
  `http://localhost:${process.env.ESTIMATOR_API_PORT || "8001"}`;

const guard = (request: Request) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("x-admin-password");
  return Boolean(adminPassword) && header === adminPassword;
};

export async function GET(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [saved, defaults] = await Promise.all([
    getPricingSettings(),
    fetch(`${ESTIMATOR_URL}/settings/defaults`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);
  return NextResponse.json({ saved, defaults });
}

// Body: a full settings object to save, or { reset: true } to fall back to .env.
export async function PUT(request: Request) {
  if (!guard(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  try {
    if (body?.reset === true) {
      await savePricingSettings(null);
      return NextResponse.json({ saved: null });
    }
    const parsed = parsePricingSettings(body);
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    await savePricingSettings(parsed.value);
    return NextResponse.json({ saved: parsed.value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}
