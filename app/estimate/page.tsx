"use client";

import { useRef, useMemo, useState, useEffect } from "react";

const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

const STEPS = [
  { label: "Data ingestion", ms: 0 },
  { label: "Pattern recognition", ms: 5000 },
  { label: "Market data scraping", ms: 12000 },
  { label: "Statistical correlation", ms: 28000 },
  { label: "Aggregating insights", ms: 55000 },
  { label: "Market price formulation", ms: 72000 },
];

type EstimateResponse = {
  success: boolean;
  keywords?: string;
  suggested_price_low?: number;
  suggested_price_high?: number;
  hours_low?: number;
  hours_high?: number;
  costs?: {
    labour_low: number;
    labour_high: number;
  };
  report?: string;
  error?: string;
  job_id?: string;
  status?: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
      {children}
    </p>
  );
}

function inr(v: number) {
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function EstimatePage() {
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState("12 cm tall");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle through progress steps while loading
  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      return;
    }
    const timers = STEPS.slice(1).map((s, i) =>
      setTimeout(() => setStepIndex(i + 1), s.ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const previewLabel = useMemo(
    () => (image ? image.name : "No image selected"),
    [image],
  );

  function handleImageChange(file: File | null) {
    setFormatError(null);
    setResult(null);
    setError(null);
    if (!file) {
      setImage(null);
      setPreview(null);
      return;
    }
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setFormatError(`"${file.name}" must be a JPEG, PNG or WebP image.`);
      setImage(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }
    if (!image) {
      setError("Please choose an image first.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("dimensions", dimensions);
      fd.append("email", email.trim());

      const res = await fetch("/api/estimate", { method: "POST", body: fd });
      const text = await res.text();
      let json: EstimateResponse;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Server returned an invalid response (Status ${res.status}): ${text.substring(0, 50) || "Empty response"}`);
      }
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Failed to estimate price");
      
      if (json.job_id) {
        let currentStatus = json.status;
        while (currentStatus === "pending") {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const statusRes = await fetch(`/api/estimate/status?job_id=${json.job_id}`);
          const statusJson = await statusRes.json();
          if (!statusJson.success) {
            throw new Error(statusJson.error ?? "Polling failed");
          }
          currentStatus = statusJson.status;
          if (currentStatus === "completed") {
            setResult(statusJson);
            break;
          } else if (currentStatus === "failed") {
            throw new Error(statusJson.error ?? "Estimation job failed");
          }
        }
      } else {
        setResult(json);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (
        msg.includes("500") ||
        msg.includes("timeout") ||
        msg.includes("Failed to fetch") ||
        msg.includes("Ollama failed") ||
        msg.includes("Errno 60")
      ) {
        setError(
          "The estimator is currently unavailable for a short bit while the server syncs. It will be back shortly!",
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 lg:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-[linear-gradient(135deg,#fff8f3_0%,#ffffff_45%,#f5f7ff_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <SectionLabel>Craft estimator</SectionLabel>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                Estimate craft pricing from a photo and size.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
                Upload a product image and dimensional specifications to run a
                full algorithmic analysis against current market indices and
                tutorial data.
              </p>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
                Market Analysis Report — estimates are derived from real-time
                data aggregation.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-neutral-600 sm:grid-cols-3">
              {[
                { n: "1. Upload", d: "Send a clear product photo." },
                {
                  n: "2. Analyse",
                  d: "Algorithm aggregates and analyses live market listings and patterns.",
                },
                {
                  n: "3. Estimate",
                  d: "Data-driven price ranges derived from statistical market distributions.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm"
                >
                  <p className="font-medium text-neutral-900">{s.n}</p>
                  <p className="mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-200/60"
          >
            <div className="space-y-5">
              {/* Email */}
              <div>
                <SectionLabel>Your email</SectionLabel>
                <input
                  id="est-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  We'll use this to send you a personalised quote if needed.
                </p>
              </div>

              {/* Image */}
              <div>
                <SectionLabel>Image</SectionLabel>
                <label
                  htmlFor="est-image"
                  className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition hover:border-neutral-400 hover:bg-neutral-100"
                >
                  <input
                    id="est-image"
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FORMATS.join(",")}
                    className="hidden"
                    onChange={(e) =>
                      handleImageChange(e.target.files?.[0] ?? null)
                    }
                  />
                  <span className="text-sm font-medium text-neutral-900">
                    {previewLabel}
                  </span>
                  <span className="mt-1 text-xs text-neutral-500">
                    JPEG, PNG or WebP · Click to upload
                  </span>
                </label>
                {formatError && (
                  <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {formatError}
                  </p>
                )}
              </div>

              {/* Dimensions */}
              <div>
                <SectionLabel>Dimensions</SectionLabel>
                <input
                  id="est-dim"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 12 cm tall"
                  className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !!formatError}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Analysing…
                  </>
                ) : (
                  "Run market analysis"
                )}
              </button>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Result + preview row */}
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Preview */}
        <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5">
            <SectionLabel>Preview</SectionLabel>
          </div>
          <div className="flex min-h-[320px] items-center justify-center bg-neutral-50 p-5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Selected craft item"
                className="max-h-[420px] w-full rounded-2xl object-contain"
              />
            ) : (
              <p className="text-sm text-neutral-500">
                Your selected image will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Estimate result */}
        <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5">
            <SectionLabel>Estimate</SectionLabel>
          </div>
          <div className="flex min-h-[320px] items-center justify-center p-8">
            {loading ? (
              <div className="flex w-full flex-col gap-3">
                {STEPS.map((s, i) => {
                  const done = i < stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-500 ${
                        active
                          ? "bg-neutral-950 text-white"
                          : done
                            ? "bg-neutral-100 text-neutral-400"
                            : "opacity-25"
                      }`}
                    >
                      <span className="w-4 text-center text-xs font-bold">
                        {done ? "✓" : active ? "·" : "·"}
                      </span>
                      <span className="text-sm font-medium">{s.label}</span>
                      {active && (
                        <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : result?.suggested_price_low && result?.suggested_price_high ? (
              <div className="flex w-full flex-col items-center gap-5 text-center">
                {result.hours_low && result.hours_high && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    Estimated Time: {result.hours_low} – {result.hours_high} hours
                  </p>
                )}
                <p className="text-5xl font-bold tracking-tight text-neutral-950">
                  {inr(result.suggested_price_low)} –{" "}
                  {inr(result.suggested_price_high)}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-neutral-400">
                    Market estimate · Indian handmade market
                  </p>
                  <div className="group relative">
                    <button className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-bold text-neutral-400 hover:border-neutral-500 hover:text-neutral-600">
                      i
                    </button>
                    <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-3 text-left text-xs leading-5 text-neutral-600 shadow-lg group-hover:visible">
                      <p className="font-semibold text-neutral-900 mb-1">
                        How this price is calculated
                      </p>
                      <p>
                        Yarn cost + overhead + labour hours, then weighted
                        against real selling prices sourced from craft listings,
                        maker communities, and tutorial data.
                      </p>
                      <p className="mt-1.5 text-neutral-400">
                        {result.costs?.labour_low && result.hours_low ? `Calculated at ~₹${Math.round(result.costs.labour_low / result.hours_low)}/hr` : 'Includes material costs and estimated labour hours'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : result?.report ? (
              <div className="w-full space-y-4">
                <pre className="whitespace-pre-wrap rounded-2xl bg-neutral-950 p-4 text-xs leading-6 text-white">
                  {result.report}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Run an estimate to see pricing guidance.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
