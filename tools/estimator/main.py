"""
main.py — CLI entry point for the crochet price estimator.

Usage:
  python main.py path/to/photo.jpg "12 cm tall"
  python main.py path/to/photo.jpg "small, about 10cm" --no-youtube
"""
from __future__ import annotations

import argparse
import sys

from vision import describe_and_extract_from_path as describe_and_extract
from youtube import search_youtube_tutorials
from patterns import search_patterns
from aggregator import aggregate
from pricing import calculate_price


def run(image_path: str, dimensions: str, skip_youtube: bool = False) -> None:
    print("\n[Step 1/5] — Analysing photo...")
    description, keywords = describe_and_extract(image_path)
    print(f"   Description: {description[:120]}")
    print(f"   Keywords:    {keywords}")

    yt_insights = []
    if not skip_youtube:
        print("\n[Step 2/5] — Searching YouTube tutorials...")
        yt_insights = search_youtube_tutorials(keywords)
        print(f"   Found {len(yt_insights)} videos with usable data")

    print("\n[Step 3/5] — Searching crochet patterns & listings...")
    pat_insights = search_patterns(keywords)
    print(f"   Found {len(pat_insights)} pattern/listing pages with usable data")

    print("\n[Step 4/5] — Aggregating data...")
    agg = aggregate(keywords, description, dimensions, yt_insights, pat_insights)
    print(f"   Hook: {agg.hook_mm}mm | Yarn: {agg.yarn_meters}m / {agg.yarn_grams}g "
          f"({agg.yarn_weight}) | Hours: {agg.hours_low}–{agg.hours_high}")

    print("\n[Step 5/5] — Calculating price...")
    result = calculate_price(agg)
    print(result.format())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Estimate a fair selling price for a handmade crochet item.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python main.py turtle.jpg "12 cm tall"\n'
            '  python main.py bunny.jpg "small, ~8cm" --no-youtube\n'
        ),
    )
    parser.add_argument("image_path", help="Path to the product photo")
    parser.add_argument(
        "dimensions",
        help="Size description, e.g. '12 cm tall' or 'small, about 10cm wide'",
    )
    parser.add_argument(
        "--no-youtube",
        action="store_true",
        help="Skip YouTube API step (useful if you have no API key yet)",
    )
    args = parser.parse_args()

    run(args.image_path, args.dimensions, skip_youtube=args.no_youtube)
    return 0


if __name__ == "__main__":
    sys.exit(main())
