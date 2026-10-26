"""
pricing.py — Step 5 of the pipeline.

Applies the customisable pricing formula to AggregatedData.
All formula knobs come from config.py (which reads your .env file).

Materials counted: yarn only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from config import (
    HOURLY_RATE,
    YARN_COST_PER_METER,
    FIXED_OVERHEAD,
    MARKUP_MULTIPLIER,
    MIN_PRICE,
)
from aggregator import AggregatedData

# .env values are the defaults; the admin dashboard can override them per request.
DEFAULT_SETTINGS = {
    "hourly_rate": HOURLY_RATE,
    "yarn_cost_per_meter": YARN_COST_PER_METER,
    "fixed_overhead": FIXED_OVERHEAD,
    "markup_multiplier": MARKUP_MULTIPLIER,
    "min_price": MIN_PRICE,
}

# Sane bounds so a typo can't produce absurd or negative prices.
_BOUNDS = {
    "hourly_rate": (0, 100_000),
    "yarn_cost_per_meter": (0, 1_000),
    "fixed_overhead": (0, 100_000),
    "markup_multiplier": (0.1, 20),
    "min_price": (0, 1_000_000),
}


def resolve_settings(overrides: Optional[dict] = None) -> dict:
    """Merge valid overrides onto the defaults; ignore anything malformed."""
    settings = dict(DEFAULT_SETTINGS)
    for key, (lo, hi) in _BOUNDS.items():
        value = (overrides or {}).get(key)
        if isinstance(value, bool):
            continue
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue
        if lo <= value <= hi:
            settings[key] = value
    return settings


assert resolve_settings({"hourly_rate": "200", "markup_multiplier": -1, "min_price": None})["hourly_rate"] == 200.0
assert resolve_settings({"markup_multiplier": -1})["markup_multiplier"] == DEFAULT_SETTINGS["markup_multiplier"]

# ── Yarn weight → approximate meters per gram lookup ─────────────────────────
_WEIGHT_TO_MPG = {
    "lace": 8.0,
    "fingering": 4.5,
    "sock": 4.5,
    "sport": 3.5,
    "dk": 2.8,
    "double knit": 2.8,
    "worsted": 2.0,
    "aran": 1.6,
    "bulky": 1.0,
    "super bulky": 0.6,
    "cotton": 3.0,
    "acrylic": 3.0,
    "wool": 2.5,
    "alpaca": 3.0,
}


@dataclass
class PriceBreakdown:
    # Inputs used
    hours_low: float
    hours_high: float
    yarn_meters: Optional[int]
    yarn_weight: Optional[str]

    # Costs (₹)
    yarn_cost: float
    overhead: float
    labour_low: float
    labour_high: float
    total_cost_low: float
    total_cost_high: float

    # Final prices (₹)
    suggested_low: float
    suggested_high: float
    market_low: Optional[float]
    market_high: Optional[float]

    settings: dict = field(default_factory=lambda: dict(DEFAULT_SETTINGS))

    def format(self) -> str:
        """Pretty-print the estimate."""

        def inr(v: float) -> str:
            return f"₹{v:,.0f}"

        st = self.settings

        market_line = (
            f"  {'Market range (online):':<35} {inr(self.market_low)} – {inr(self.market_high)}"
            if self.market_low and self.market_high
            else "  Market range (online):             not enough data"
        )

        return (
            "\n"
            "══════════════════════════════════════════════════\n"
            "  CROCHET PRICE ESTIMATE\n"
            "══════════════════════════════════════════════════\n"
            f"  {'Yarn (' + (str(self.yarn_meters) + 'm' if self.yarn_meters else '?') + '):':<35} {inr(self.yarn_cost)}\n"
            f"  {'Overhead (pkg, extras):':<35} {inr(self.overhead)}\n"
            f"  {'─' * 46}\n"
            f"  {'Total materials:':<35} {inr(self.yarn_cost + self.overhead)}\n"
            "\n"
            f"  {'Time estimate:':<35} {self.hours_low}–{self.hours_high} hrs\n"
            f"  {'Labour (@ ₹{:.0f}/hr):'.format(st['hourly_rate']):<35} {inr(self.labour_low)} – {inr(self.labour_high)}\n"
            "\n"
            f"  {'Cost basis:':<35} {inr(self.total_cost_low)} – {inr(self.total_cost_high)}\n"
            f"  {'Markup ({:.1f}×):'.format(st['markup_multiplier']):<35} {inr(self.total_cost_low * st['markup_multiplier'])} – {inr(self.total_cost_high * st['markup_multiplier'])}\n"
            "\n"
            + market_line + "\n"
            "\n"
            f"  {'Suggested selling price:':<35} {inr(self.suggested_low)} – {inr(self.suggested_high)}\n"
            "══════════════════════════════════════════════════\n"
            f"\n  Formula knobs (edit in the admin dashboard):\n"
            f"    hourly_rate={st['hourly_rate']}  yarn_cost_per_meter={st['yarn_cost_per_meter']}\n"
            f"    fixed_overhead={st['fixed_overhead']}  markup_multiplier={st['markup_multiplier']}  min_price={st['min_price']}\n"
        )


def _estimate_meters(agg: AggregatedData) -> Optional[int]:
    """Return best meters estimate: direct, or derived from grams × mpg lookup."""
    if agg.yarn_meters:
        return agg.yarn_meters
    if agg.yarn_grams and agg.yarn_weight:
        mpg = _WEIGHT_TO_MPG.get(agg.yarn_weight.lower())
        if mpg:
            return round(agg.yarn_grams * mpg)
    if agg.yarn_grams:
        return round(agg.yarn_grams * 3.0)  # generic fallback
    return None


def calculate_price(agg: AggregatedData, overrides: Optional[dict] = None) -> PriceBreakdown:
    st = resolve_settings(overrides)
    min_price = st["min_price"]

    yarn_meters = _estimate_meters(agg)
    yarn_cost = (yarn_meters * st["yarn_cost_per_meter"]) if yarn_meters else 0.0
    overhead = st["fixed_overhead"]

    labour_low = agg.hours_low * st["hourly_rate"]
    labour_high = agg.hours_high * st["hourly_rate"]

    total_low = yarn_cost + overhead + labour_low
    total_high = yarn_cost + overhead + labour_high

    suggested_low = max(total_low * st["markup_multiplier"], min_price)
    suggested_high = max(total_high * st["markup_multiplier"], min_price)

    # Nudge suggested price toward market if market data is available
    if agg.market_low_inr and agg.market_high_inr:
        market_mid = (agg.market_low_inr + agg.market_high_inr) / 2
        # Blend: 70% formula, 30% market signal
        suggested_low = max(suggested_low * 0.7 + market_mid * 0.3 * 0.9, min_price)
        suggested_high = max(suggested_high * 0.7 + market_mid * 0.3 * 1.1, min_price)

    return PriceBreakdown(
        hours_low=agg.hours_low,
        hours_high=agg.hours_high,
        yarn_meters=yarn_meters,
        yarn_weight=agg.yarn_weight,
        yarn_cost=round(yarn_cost, 2),
        overhead=overhead,
        labour_low=round(labour_low, 2),
        labour_high=round(labour_high, 2),
        total_cost_low=round(total_low, 2),
        total_cost_high=round(total_high, 2),
        suggested_low=round(suggested_low),
        suggested_high=round(suggested_high),
        market_low=agg.market_low_inr,
        market_high=agg.market_high_inr,
        settings=st,
    )
