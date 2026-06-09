"""
aggregator.py — Step 4 of the pipeline.

Takes raw VideoInsights + PatternInsights and produces a single clean
AggregatedData object that the pricing step can use.

Strategy:
  - For numeric fields (hook, grams, meters, hours): use median of available values
  - For categorical (yarn_weights): use most common across all sources
  - For market prices: collect all INR values, filter outliers, return range
"""
from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from typing import Optional

from youtube import VideoInsights
from patterns import PatternInsights


@dataclass
class AggregatedData:
    keywords: str
    description: str
    dimensions: str

    # Material estimates
    hook_mm: Optional[float] = None
    yarn_weight: Optional[str] = None      # most common weight found
    yarn_meters: Optional[int] = None      # estimated meters needed
    yarn_grams: Optional[int] = None       # estimated grams needed
    safety_eyes_mm: Optional[int] = None

    # Time estimates
    hours_low: float = 1.0
    hours_high: float = 3.0

    # Market prices (INR)
    market_prices_inr: list[float] = field(default_factory=list)
    market_low_inr: Optional[float] = None
    market_high_inr: Optional[float] = None

    # Source counts (for transparency)
    youtube_sources: int = 0
    pattern_sources: int = 0


def _to_float(v) -> Optional[float]:
    """Safely convert a value to float — handles strings from LLM output."""
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def _median_of(values: list) -> Optional[float]:
    clean = [f for v in values for f in [_to_float(v)] if f is not None]
    if not clean:
        return None
    return statistics.median(clean)


def _most_common(items: list[str]) -> Optional[str]:
    if not items:
        return None
    return max(set(items), key=items.count)


def _filter_price_outliers(prices: list[float]) -> list[float]:
    """Remove prices that are clearly wrong (e.g. 1, 10000000)."""
    plausible = [p for p in prices if 50 <= p <= 50_000]
    if not plausible:
        return prices  # give up filtering if nothing left
    if len(plausible) >= 4:
        q1 = statistics.quantiles(plausible, n=4)[0]
        q3 = statistics.quantiles(plausible, n=4)[2]
        iqr = q3 - q1
        plausible = [p for p in plausible if q1 - 1.5 * iqr <= p <= q3 + 1.5 * iqr]
    return plausible or prices


def aggregate(
    keywords: str,
    description: str,
    dimensions: str,
    yt_insights: list[VideoInsights],
    pat_insights: list[PatternInsights],
) -> AggregatedData:
    agg = AggregatedData(
        keywords=keywords,
        description=description,
        dimensions=dimensions,
        youtube_sources=len(yt_insights),
        pattern_sources=len(pat_insights),
    )

    # ── Collect all values from both sources ─────────────────────────────────
    all_hook: list[float] = []
    all_grams: list[float] = []
    all_meters: list[float] = []
    all_hours_low: list[float] = []
    all_hours_high: list[float] = []
    all_yarn_weights: list[str] = []
    all_safety_eyes: list[int] = []
    all_inr: list[float] = []

    for v in yt_insights:
        if _to_float(v.hook_mm):
            all_hook.append(v.hook_mm)
        if _to_float(v.yarn_grams):
            all_grams.append(float(v.yarn_grams))
        if _to_float(v.yarn_meters):
            all_meters.append(float(v.yarn_meters))
        if _to_float(v.hours_low):
            all_hours_low.append(float(v.hours_low))
        if _to_float(v.hours_high):
            all_hours_high.append(float(v.hours_high))
        if v.safety_eyes_mm:
            all_safety_eyes.append(int(float(v.safety_eyes_mm)))
        all_yarn_weights.extend(v.yarn_weights)

    for p in pat_insights:
        if _to_float(p.hook_mm):
            all_hook.append(p.hook_mm)
        if _to_float(p.yarn_grams):
            all_grams.append(float(p.yarn_grams))
        if _to_float(p.yarn_meters):
            all_meters.append(float(p.yarn_meters))
        if _to_float(p.hours_low):
            all_hours_low.append(float(p.hours_low))
        if _to_float(p.hours_high):
            all_hours_high.append(float(p.hours_high))
        all_yarn_weights.extend(p.yarn_weights)
        all_inr.extend(p.inr_prices)
        all_inr.extend(usd * 83 for usd in p.usd_prices)


    # ── Compute aggregates ────────────────────────────────────────────────────
    agg.hook_mm = _median_of(all_hook)
    agg.yarn_grams = int(_median_of(all_grams)) if _median_of(all_grams) else None
    agg.yarn_meters = int(_median_of(all_meters)) if _median_of(all_meters) else None
    agg.yarn_weight = _most_common(all_yarn_weights)
    agg.safety_eyes_mm = int(statistics.median(all_safety_eyes)) if all_safety_eyes else None

    # Hours: default to sensible range if nothing found
    low = _median_of(all_hours_low) or 2.0
    high = _median_of(all_hours_high) or max(low * 1.5, low + 1.0)
    agg.hours_low = round(low, 1)
    agg.hours_high = round(high, 1)

    # Market prices
    clean_prices = _filter_price_outliers(all_inr)
    if clean_prices:
        agg.market_prices_inr = sorted(clean_prices)
        agg.market_low_inr = min(clean_prices)
        agg.market_high_inr = max(clean_prices)

    return agg
