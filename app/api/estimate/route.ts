/**
 * /api/estimate/route.ts
 *
 * Proxies the image + dimensions to the Python FastAPI estimator server
 * (tools/estimator/server.py running on port 8001).
 *
 * direct-Ollama path so the page doesn't completely break.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ESTIMATOR_URL =
  process.env.ESTIMATOR_API_URL ||
  `http://localhost:${process.env.ESTIMATOR_API_PORT || "8001"}`;

// ── Legacy fallback (direct Ollama — used if Python server is down) ───────────
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://192.168.0.102:11434";
const VISION_MODEL = process.env.VISION_MODEL || "llava-phi3";
const TEXT_MODEL = process.env.TEXT_MODEL || "llama3.2";

async function ollamaChat(model: string, content: string, images?: string[]) {
  const response = await fetch(`${OLLAMA_HOST.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content, ...(images ? { images } : {}) }],
      stream: false,
    }),
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(json?.error || `Ollama failed (${response.status})`);
  return String(json?.message?.content || "").trim();
}

async function legacyEstimate(image: File, dimensions: string) {
  const buf = await image.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");

  const description = await ollamaChat(
    VISION_MODEL,
    "Identify this handmade crochet item. Name the item, style, and main colors in one sentence.",
    [b64],
  );

  const keywords = await ollamaChat(
    TEXT_MODEL,
    `Give me a short product name (3-5 words max) for this crochet item based on: ${description}`,
  );

  // Ask for a JSON price range with Indian market context
  const priceJson = await ollamaChat(
    TEXT_MODEL,
    `You are helping price handmade crochet items sold in India.
Item: ${keywords.trim()}
Size: ${dimensions}
Context: Small Indian city, handmade goods market. Yarn costs ₹0.80/meter, labour ₹120-150/hr.
Typical amigurumi sell for ₹300-₹900 in India depending on size and complexity.

Respond with ONLY a JSON object, no explanation:
{"price_low": <number>, "price_high": <number>}`,
  );

  let low: number | undefined;
  let high: number | undefined;
  try {
    const cleaned = priceJson
      .replace(/```[a-z]*/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    low = Number(parsed.price_low);
    high = Number(parsed.price_high);
  } catch {
    // couldn't parse — fall back to showing raw text
  }

  return NextResponse.json({
    success: true,
    keywords: keywords.trim(),
    suggested_price_low: low,
    suggested_price_high: high,
    source: "legacy",
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const dimensions = String(formData.get("dimensions") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const skipYoutube = formData.get("skip_youtube") === "true";

    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing image" },
        { status: 400 },
      );
    }

    // Log the quote request server-side so you can follow up
    if (email) {
      console.log(
        `[estimate] Quote request from ${email} — "${dimensions}" — ${new Date().toISOString()}`,
      );
    }

    // ── Try Python estimator server first ────────────────────────────────────
    try {
      const proxyForm = new FormData();
      proxyForm.append("image", image);
      proxyForm.append("dimensions", dimensions);
      proxyForm.append("skip_youtube", "true");
      if (email) proxyForm.append("email", email);
      if (skipYoutube) proxyForm.append("skip_youtube", "true");

      const resp = await fetch(`${ESTIMATOR_URL}/estimate`, {
        method: "POST",
        body: proxyForm,
        signal: AbortSignal.timeout(120_000), // 120 second timeout
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Estimator server error ${resp.status}: ${err}`);
      }

      const data = await resp.json();

      // --- SUPABASE TRACKING LOGIC ---
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const ext = image.name.split('.').pop() || 'jpg';
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("estimate_uploads")
            .upload(filename, image, { contentType: image.type });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from("estimate_uploads")
              .getPublicUrl(uploadData.path);
            
            await supabase.from("estimate_history").insert({
              email: email || null,
              image_url: publicUrlData.publicUrl,
            });

            // Prune to 15 records
            const { data: oldRecords } = await supabase
              .from("estimate_history")
              .select("id, image_url")
              .order("created_at", { ascending: false })
              .range(15, 100);

            if (oldRecords && oldRecords.length > 0) {
              const idsToDelete = oldRecords.map((r) => r.id);
              const filesToDelete = oldRecords.map((r) => {
                const parts = r.image_url.split('/');
                return parts[parts.length - 1];
              });
              await supabase.from("estimate_history").delete().in("id", idsToDelete);
              await supabase.storage.from("estimate_uploads").remove(filesToDelete);
            }
          } else {
            console.error("[estimate] Supabase upload error:", uploadErr);
          }
        } catch (supabaseErr) {
          console.error("[estimate] Supabase tracking failed:", supabaseErr);
        }
      }

      return NextResponse.json({ success: true, source: "python", ...data });
    } catch (proxyErr) {
      console.warn(
        "[estimate] Python server unavailable, using legacy fallback:",
        proxyErr,
      );
      return await legacyEstimate(image, dimensions);
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Estimation failed",
      },
      { status: 500 },
    );
  }
}
