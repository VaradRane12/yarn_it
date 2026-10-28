// Client-safe pricing field definitions, shared by the admin UI and the server.
export const PRICING_FIELDS = {
  hourly_rate: { label: "Hourly rate (₹/hr)", min: 0, max: 100_000 },
  yarn_cost_per_meter: { label: "Yarn cost (₹/meter)", min: 0, max: 1_000 },
  fixed_overhead: { label: "Fixed overhead (₹)", min: 0, max: 100_000 },
  markup_multiplier: { label: "Markup multiplier (×)", min: 0.1, max: 20 },
  min_price: { label: "Minimum price (₹)", min: 0, max: 1_000_000 },
} as const;

export type PricingKey = keyof typeof PRICING_FIELDS;
export type PricingSettings = Record<PricingKey, number>;
