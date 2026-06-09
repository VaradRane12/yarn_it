"""
config.py — Load all settings from .env once, import everywhere else.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the estimator folder (works whether you run from root or inside)
_here = Path(__file__).parent
load_dotenv(_here / ".env", override=False)
load_dotenv(_here / ".env.example", override=False)  # fallback defaults


# ── Ollama ────────────────────────────────────────────────────────────────────
OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://192.168.0.102:11434")
VISION_MODEL: str = os.environ.get("VISION_MODEL", "llava-phi3")
TEXT_MODEL: str = os.environ.get("TEXT_MODEL", "llama3.2")

# ── YouTube ───────────────────────────────────────────────────────────────────
YOUTUBE_API_KEY: str = os.environ.get("YOUTUBE_API_KEY", "")

# ── Pricing formula knobs ─────────────────────────────────────────────────────
HOURLY_RATE: float = float(os.environ.get("HOURLY_RATE", "150"))
YARN_COST_PER_METER: float = float(os.environ.get("YARN_COST_PER_METER", "0.80"))
FIXED_OVERHEAD: float = float(os.environ.get("FIXED_OVERHEAD", "50"))
MARKUP_MULTIPLIER: float = float(os.environ.get("MARKUP_MULTIPLIER", "2.0"))
MIN_PRICE: float = float(os.environ.get("MIN_PRICE", "200"))

# ── API server ────────────────────────────────────────────────────────────────
API_PORT: int = int(os.environ.get("API_PORT", "8001"))
