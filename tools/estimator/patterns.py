"""
patterns.py — Step 3B of the pipeline.

Searches DuckDuckGo (via ddgs) for crochet pattern pages and listings.
Scrapes each page's text, then sends it to the Ollama LLM to extract:
  - Yarn weight / type / grams / meters
  - Hook size
  - Time to make
  - Market prices (INR / USD)

No regex — LLM does all the extraction.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

import ollama
import requests
from bs4 import BeautifulSoup
from ddgs import DDGS

from config import OLLAMA_HOST, TEXT_MODEL

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

# Domains that block scraping or need login
_SKIP_DOMAINS = {
    "pinterest.com", "pinterest.in", "pin.it",
    "instagram.com", "facebook.com",
}


@dataclass
class PatternInsights:
    url: str
    source: str
    hook_mm: Optional[float] = None
    yarn_weights: list[str] = field(default_factory=list)
    yarn_grams: Optional[int] = None
    yarn_meters: Optional[int] = None
    hours_low: Optional[float] = None
    hours_high: Optional[float] = None
    inr_prices: list[float] = field(default_factory=list)
    usd_prices: list[float] = field(default_factory=list)


def _client() -> ollama.Client:
    return ollama.Client(host=OLLAMA_HOST)


def _scrape_text(url: str, timeout: int = 8) -> str:
    """Fetch a page and return its visible text. Returns '' on failure."""
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except Exception:
        return ""


def _extract_with_llm(text: str, url: str) -> dict:
    """
    Send scraped page text to Ollama and extract crochet data as JSON.

    Returns a dict with keys:
      hook_mm, yarn_weight, yarn_grams, yarn_meters,
      hours_low, hours_high, inr_prices, usd_prices
    """
    client = _client()

    prompt = f"""You are analysing a crochet pattern page or product listing.
Extract the following information from the text below.
Respond with ONLY a valid JSON object — no explanation, no markdown fences.

Fields to extract (use null or [] if not found):
- hook_mm: crochet hook size in millimetres (number) or null
- yarn_weight: yarn weight/type (e.g. "dk", "worsted", "cotton", "acrylic") or null
- yarn_grams: grams of yarn required (integer) or null
- yarn_meters: meters of yarn required (integer) or null  
- hours_low: minimum hours to make this item (number) or null
- hours_high: maximum hours to make this item (number) or null
- inr_prices: list of prices in Indian Rupees (₹) found on the page (list of numbers, e.g. [850, 1200])
- usd_prices: list of prices in US Dollars ($) found on the page (list of numbers, e.g. [10.99])

Source URL: {url}

Page text (first 3000 chars):
{text[:3000]}

JSON:"""

    try:
        res = client.chat(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = res["message"]["content"].strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        print(f"[patterns] LLM parse failed for {url}: {e}")
        return {}


def search_patterns(keywords: str, max_results: int = 5) -> list[PatternInsights]:
    """
    Search DuckDuckGo for crochet pattern pages and listings.
    Scrapes each result and uses Ollama to extract material and price data.
    """
    all_insights: list[PatternInsights] = []
    seen_urls: set[str] = set()

    queries = [
        f"{keywords} crochet pattern materials hook size",
        f"{keywords} amigurumi handmade price buy",
    ]

    for query in queries:
        try:
            results = list(DDGS().text(query, max_results=max_results))
        except Exception as e:
            print(f"[patterns] DDG search failed: {e}")
            continue

        for r in results:
            url = r.get("href") or r.get("url", "")
            if not url or url in seen_urls:
                continue
            domain = urlparse(url).netloc.replace("www.", "")
            if any(skip in domain for skip in _SKIP_DOMAINS):
                continue
            seen_urls.add(url)

            text = _scrape_text(url)
            if len(text) < 200:
                continue

            extracted = _extract_with_llm(text, url)
            if not extracted:
                continue

            ins = PatternInsights(
                url=url,
                source=domain,
                hook_mm=extracted.get("hook_mm"),
                yarn_weights=[extracted["yarn_weight"]] if extracted.get("yarn_weight") else [],
                yarn_grams=extracted.get("yarn_grams"),
                yarn_meters=extracted.get("yarn_meters"),
                hours_low=extracted.get("hours_low"),
                hours_high=extracted.get("hours_high"),
                inr_prices=[float(p) for p in extracted.get("inr_prices") or []],
                usd_prices=[float(p) for p in extracted.get("usd_prices") or []],
            )
            all_insights.append(ins)
            print(f"[patterns] ✓ {domain:<35} "
                  f"hook:{ins.hook_mm}mm  "
                  f"yarn:{ins.yarn_grams}g/{ins.yarn_meters}m  "
                  f"INR:{ins.inr_prices[:2]}")

    return all_insights
