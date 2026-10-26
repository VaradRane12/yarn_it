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
  return <p className="field-label">{children}</p>;
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
        throw new Error(
          `Server returned an invalid response (Status ${res.status}): ${text.substring(0, 50) || "Empty response"}`,
        );
      }
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Failed to estimate price");

      if (json.job_id) {
        let currentStatus = json.status;
        while (currentStatus === "pending") {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const statusRes = await fetch(
            `/api/estimate/status?job_id=${json.job_id}`,
          );
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
    <main className="knit min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 lg:px-6">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-8">
            <div className="mb-0 pt-10 md:pt-14">
              <p className="eyebrow">✺ Custom orders</p>
              <h1 className="mt-3 font-display text-[clamp(3rem,8vw,6.5rem)] uppercase leading-[0.88]">
                What would <span className="text-outline">it</span> cost?
              </h1>
              <p className="mt-4 max-w-xl text-lg font-medium leading-7">
                Upload a photo of any crochet piece you love. We look at it,
                guess the yarn and hours, check what similar pieces sell for,
                and email you a quote.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Upload",
                  d: "A clear photo and rough size.",
                  c: "bg-lilac",
                },
                {
                  n: "02",
                  t: "Analyse",
                  d: "We estimate yarn, time and market price.",
                  c: "bg-butter",
                },
                {
                  n: "03",
                  t: "Quote",
                  d: "Your price lands here and in your inbox.",
                  c: "bg-mint",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className={`rounded-[1.5rem] border-[3px] border-ink p-5 shadow-chunky-sm ${s.c}`}
                >
                  <p className="font-display text-3xl">{s.n}</p>
                  <p className="mt-1 font-display text-2xl uppercase">{s.t}</p>
                  <p className="mt-1 text-sm font-medium">{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card self-start lg:mt-14">
            <div className="space-y-5">
              <div>
                <SectionLabel>Your email</SectionLabel>
                <input
                  id="est-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field"
                />
                <p className="mt-1.5 text-xs font-medium text-ink/60">
                  We&apos;ll email you the quote, so you can reply to order it.
                </p>
              </div>

              <div>
                <SectionLabel>Photo</SectionLabel>
                <label
                  htmlFor="est-image"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-ink bg-cream px-4 py-8 text-center transition hover:bg-butter/40"
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
                  <span className="text-3xl">🧶</span>
                  <span className="mt-2 text-sm font-bold">{previewLabel}</span>
                  <span className="mt-1 text-xs font-medium text-ink/60">
                    JPEG, PNG or WebP · tap to upload
                  </span>
                </label>
                {formatError && (
                  <p className="mt-2 rounded-xl border-2 border-ink bg-coral/30 px-3 py-2 text-xs font-medium">
                    {formatError}
                  </p>
                )}
              </div>

              <div>
                <SectionLabel>Size</SectionLabel>
                <input
                  id="est-dim"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 12 cm tall"
                  className="field"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !!formatError}
                className="btn w-full"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                    Analysing…
                  </>
                ) : (
                  "Get my quote"
                )}
              </button>

              {error && (
                <div className="rounded-2xl border-2 border-ink bg-coral/30 p-4 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          </form>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[2rem] border-[3px] border-ink bg-white shadow-chunky">
            <div className="border-b-[3px] border-ink bg-sky px-6 py-4">
              <p className="eyebrow">Your photo</p>
            </div>
            <div className="flex min-h-[320px] items-center justify-center p-5">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Selected craft item"
                  className="max-h-[420px] w-full rounded-2xl object-contain"
                />
              ) : (
                <p className="text-sm font-medium text-ink/60">
                  Your photo will show up here.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border-[3px] border-ink bg-white shadow-chunky">
            <div className="border-b-[3px] border-ink bg-bubblegum px-6 py-4">
              <p className="eyebrow">Your quote</p>
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
                        className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-500 ${
                          active
                            ? "border-ink bg-butter"
                            : done
                              ? "border-transparent bg-cream text-ink/50"
                              : "border-transparent opacity-30"
                        }`}
                      >
                        <span className="w-4 text-center text-xs font-bold">
                          {done ? "✓" : "·"}
                        </span>
                        <span className="text-sm font-bold">{s.label}</span>
                        {active && (
                          <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : result?.suggested_price_low &&
                result?.suggested_price_high ? (
                <div className="flex w-full flex-col items-center gap-5 text-center">
                  {result.hours_low && result.hours_high && (
                    <p className="eyebrow">
                      About {result.hours_low}–{result.hours_high} hours of
                      crochet
                    </p>
                  )}
                  <p className="font-display text-[clamp(3rem,7vw,5rem)] leading-none">
                    {inr(result.suggested_price_low)} –{" "}
                    {inr(result.suggested_price_high)}
                  </p>
                  <p className="rounded-full border-2 border-ink bg-mint px-4 py-1.5 text-xs font-bold">
                    📬 A copy is on its way to {email.trim() || "your inbox"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-ink/60">
                      Market estimate · Indian handmade market
                    </p>
                    <div className="group relative">
                      <button
                        type="button"
                        className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink text-[10px] font-bold"
                      >
                        i
                      </button>
                      <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-2xl border-2 border-ink bg-white p-3 text-left text-xs leading-5 shadow-chunky-sm group-hover:visible">
                        <p className="mb-1 font-bold">
                          How this price is worked out
                        </p>
                        <p>
                          Yarn cost + overhead + labour hours, then weighed
                          against real selling prices from craft listings and
                          maker communities.
                        </p>
                        <p className="mt-1.5 text-ink/60">
                          {result.costs?.labour_low && result.hours_low
                            ? `Labour at ~₹${Math.round(result.costs.labour_low / result.hours_low)}/hr`
                            : "Includes materials and estimated labour hours"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : result?.report ? (
                <pre className="w-full whitespace-pre-wrap rounded-2xl bg-ink p-4 text-xs leading-6 text-cream">
                  {result.report}
                </pre>
              ) : (
                <p className="text-sm font-medium text-ink/60">
                  Run an estimate to see your price here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
