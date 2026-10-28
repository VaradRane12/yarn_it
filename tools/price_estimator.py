"""Craft product price estimator using a remote Ollama host.

This script:
1. Describes the image with a vision model.
2. Extracts clean product keywords.
3. Optionally gathers public web context.
4. Produces a simple estimate for production time, materials, and fair price.

Environment variables:
- OLLAMA_HOST: remote Ollama base URL, for example http://192.168.0.102:11434
- VISION_MODEL: vision-capable model name, default llava-phi3
- TEXT_MODEL: text model name, default llama3.2
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from typing import List

import ollama
from duckduckgo_search import DDGS

DEFAULT_OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://192.168.0.102:11434")
DEFAULT_VISION_MODEL = os.environ.get("VISION_MODEL", "llava-phi3")
DEFAULT_TEXT_MODEL = os.environ.get("TEXT_MODEL", "llama3.2")


@dataclass
class EstimationResult:
    keywords: str
    context: str
    report: str


def _client() -> ollama.Client:
    return ollama.Client(host=DEFAULT_OLLAMA_HOST)


def get_product_keywords(image_path: str) -> str:
    client = _client()
    vision_res = client.chat(
        model=DEFAULT_VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": (
                    "Identify the exact item. Specify the craft type, material, "
                    "and complexity. List the primary colors."
                ),
                "images": [image_path],
            }
        ],
    )
    visual_description = vision_res["message"]["content"]

    cleaner_res = client.chat(
        model=DEFAULT_TEXT_MODEL,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract a precise, comma separated list of product attributes "
                    "from this text. Ignore background details and contradictory colors.\n\n"
                    f"Text: {visual_description}"
                ),
            }
        ],
    )
    return cleaner_res["message"]["content"].strip()


def fetch_market_data(keywords: str, dimensions: str, max_results: int = 4) -> str:
    search_query = f"{keywords} {dimensions} pricing specifications materials"
    results = DDGS().text(search_query, max_results=max_results)
    snippets: List[str] = []
    for result in results:
        body = result.get("body") or result.get("title") or ""
        if body:
            snippets.append(body)
    return " ".join(snippets)


def estimate_metrics(keywords: str, dimensions: str, context: str) -> str:
    client = _client()
    synthesis_prompt = f"""
Analyze the search data to estimate:
1. Production Time (hours)
2. Material List
3. Fair Market Price
4. Suggested retail range in INR

Item: {keywords}
Size: {dimensions}
Context: {context}

Return a concise business-ready estimate with bullet points.
""".strip()
    final_res = client.chat(
        model=DEFAULT_TEXT_MODEL,
        messages=[{"role": "user", "content": synthesis_prompt}],
    )
    return final_res["message"]["content"].strip()


def calculate_craft_price(image_path: str, user_dimensions: str) -> EstimationResult:
    keywords = get_product_keywords(image_path)
    context = fetch_market_data(keywords, user_dimensions)
    report = estimate_metrics(keywords, user_dimensions, context)
    return EstimationResult(keywords=keywords, context=context, report=report)


def main() -> int:
    parser = argparse.ArgumentParser(description="Estimate craft product pricing from an image.")
    parser.add_argument("image_path", help="Path to the product image")
    parser.add_argument(
        "dimensions",
        help="User-provided dimensions, for example '12 cm tall' or 'small size'",
    )
    args = parser.parse_args()

    result = calculate_craft_price(args.image_path, args.dimensions)
    print("Keywords:")
    print(result.keywords)
    print("\nMarket context:")
    print(result.context or "No market data found.")
    print("\nEstimate:")
    print(result.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
