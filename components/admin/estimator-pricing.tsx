"use client";

import {
  PRICING_FIELDS,
  type PricingKey,
  type PricingSettings,
} from "lib/estimator-pricing-fields";
import { useState } from "react";

const KEYS = Object.keys(PRICING_FIELDS) as PricingKey[];

const HINTS: Record<PricingKey, string> = {
  hourly_rate: "What you earn per hour of crochet.",
  yarn_cost_per_meter: "Average yarn price per meter.",
  fixed_overhead: "Packaging, stuffing, eyes, shipping prep. Added once.",
  markup_multiplier: "Cost × this = price. Below 1 means selling under cost.",
  min_price: "No quote goes below this.",
};

// Mirrors tools/estimator/pricing.py (without the market-price blend).
function preview(s: PricingSettings, hours: number, meters: number) {
  const cost =
    meters * s.yarn_cost_per_meter + s.fixed_overhead + hours * s.hourly_rate;
  return { cost, price: Math.max(cost * s.markup_multiplier, s.min_price) };
}

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default function EstimatorPricing({
  adminPassword,
}: {
  adminPassword: string;
}) {
  const [form, setForm] = useState<Record<PricingKey, string> | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [status, setStatus] = useState("");
  const [hours, setHours] = useState("3");
  const [meters, setMeters] = useState("60");

  const headers = {
    "Content-Type": "application/json",
    "x-admin-password": adminPassword,
  };

  function fill(values: Partial<PricingSettings> | null) {
    setForm(
      Object.fromEntries(
        KEYS.map((k) => [k, values?.[k] != null ? String(values[k]) : ""]),
      ) as Record<PricingKey, string>,
    );
  }

  async function load() {
    setStatus("loading…");
    const res = await fetch("/api/admin/estimator", { headers });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error || "failed to load");
    fill(json.saved ?? json.defaults);
    setUsingDefaults(!json.saved);
    setStatus(
      json.saved
        ? "loaded your saved settings"
        : json.defaults
          ? "no saved settings yet, showing the estimator's .env defaults"
          : "estimator unreachable and nothing saved; enter values to save",
    );
  }

  async function save(body: unknown) {
    setStatus("saving…");
    const res = await fetch("/api/admin/estimator", {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error || "save failed");
    if (json.saved) {
      setUsingDefaults(false);
      setStatus("saved, new estimates use these numbers");
    } else {
      await load();
      setStatus("reset, new estimates use the .env defaults");
    }
  }

  const parsed =
    form &&
    KEYS.every((k) => form[k] !== "" && Number.isFinite(Number(form[k])))
      ? (Object.fromEntries(
          KEYS.map((k) => [k, Number(form[k])]),
        ) as PricingSettings)
      : null;
  const example = parsed
    ? preview(parsed, Number(hours) || 0, Number(meters) || 0)
    : null;

  return (
    <section className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-1 text-lg font-semibold">Estimator pricing</h2>
      <p className="mb-3 text-sm text-neutral-600">
        These numbers turn the estimator&apos;s hours and yarn guess into a
        price. Changes apply to the next estimate; past quotes don&apos;t
        change.
      </p>

      <button
        className="mb-4 rounded bg-gray-200 px-3 py-1"
        type="button"
        onClick={load}
      >
        {form ? "Reload" : "Load pricing"}
      </button>

      {form ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {KEYS.map((k) => (
              <label key={k} className="block text-sm">
                <span className="mb-1 block font-medium">
                  {PRICING_FIELDS[k].label}
                </span>
                <input
                  type="number"
                  step="any"
                  min={PRICING_FIELDS[k].min}
                  max={PRICING_FIELDS[k].max}
                  className="w-full rounded border px-3 py-2"
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  {HINTS[k]}
                </span>
              </label>
            ))}
          </div>

          {parsed && parsed.markup_multiplier < 1 ? (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
              Markup is below 1×, so quotes come out lower than your own cost.
            </p>
          ) : null}

          <div className="mt-4 rounded border border-neutral-200 bg-white p-3 text-sm">
            <p className="font-medium">Example quote</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              A piece taking
              <input
                type="number"
                className="w-16 rounded border px-2 py-1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              hours and
              <input
                type="number"
                className="w-20 rounded border px-2 py-1"
                value={meters}
                onChange={(e) => setMeters(e.target.value)}
              />
              meters of yarn
            </div>
            <p className="mt-2">
              {example
                ? `costs you ${inr(example.cost)} → quoted at ${inr(example.price)}`
                : "fill in every field to see the result"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Real quotes also nudge toward online market prices when found.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              type="button"
              disabled={!parsed}
              onClick={() => save(parsed)}
            >
              Save pricing
            </button>
            {!usingDefaults ? (
              <button
                className="rounded border border-neutral-300 px-3 py-2 text-sm"
                type="button"
                onClick={() => save({ reset: true })}
              >
                Reset to .env defaults
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {status ? (
        <p className="mt-3 text-sm text-neutral-600">{status}</p>
      ) : null}
    </section>
  );
}
