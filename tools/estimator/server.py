"""
server.py — FastAPI web API for the price estimator.

Exposes a single POST /estimate endpoint that accepts a photo upload
and a dimensions string, runs the full pipeline, and returns JSON.

The Next.js /app/api/estimate/route.ts calls this server.

Start with:
  python server.py
  # or: uvicorn server:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import API_PORT
from vision import describe_and_extract
from youtube import search_youtube_tutorials
from patterns import search_patterns
from aggregator import aggregate
from pricing import calculate_price, PriceBreakdown

app = FastAPI(
    title="Crochet Price Estimator API",
    description="Upload a photo + dimensions to get a suggested selling price.",
    version="1.0.0",
)

# Allow the Next.js app (localhost / your domain) to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production if needed
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/estimate")
async def estimate(
    image: UploadFile = File(..., description="Photo of the crochet item"),
    dimensions: str = Form(..., description="Size, e.g. '12 cm tall'"),
    skip_youtube: bool = Form(False, description="Set true to skip YouTube step"),
) -> dict:
    """
    Run the full price estimation pipeline.

    Returns a JSON object with the price breakdown and a formatted report string.
    """
    # Read image bytes directly — avoids temp file path issues with Ollama
    image_bytes = await image.read()

    try:
        description, keywords = describe_and_extract(image_bytes)

        yt_insights = []
        if not skip_youtube:
            yt_insights = search_youtube_tutorials(keywords)

        pat_insights = search_patterns(keywords)
        agg = aggregate(keywords, description, dimensions, yt_insights, pat_insights)
        result: PriceBreakdown = calculate_price(agg)

        return {
            "keywords": keywords,
            "description": description,
            "dimensions": dimensions,
            "hours_low": result.hours_low,
            "hours_high": result.hours_high,
            "yarn_meters": result.yarn_meters,
            "yarn_weight": result.yarn_weight,
            "costs": {
                "yarn": result.yarn_cost,
                "overhead": result.overhead,
                "labour_low": result.labour_low,
                "labour_high": result.labour_high,
                "total_low": result.total_cost_low,
                "total_high": result.total_cost_high,
            },
            "suggested_price_low": result.suggested_low,
            "suggested_price_high": result.suggested_high,
            "market_price_low": result.market_low,
            "market_price_high": result.market_high,
            "report": result.format(),
            "sources": {
                "youtube_videos": agg.youtube_sources,
                "pattern_pages": agg.pattern_sources,
            },
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=API_PORT, reload=False)
