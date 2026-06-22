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
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uuid

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


# Global jobs dictionary to store job statuses and results
jobs = {}

def process_estimate_job(job_id: str, image_bytes: bytes, dimensions: str, skip_youtube: bool):
    try:
        description, keywords = describe_and_extract(image_bytes)

        yt_insights = []
        if not skip_youtube:
            yt_insights = search_youtube_tutorials(keywords)

        pat_insights = search_patterns(keywords)
        agg = aggregate(keywords, description, dimensions, yt_insights, pat_insights)
        result: PriceBreakdown = calculate_price(agg)

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = {
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
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@app.post("/estimate")
async def estimate(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(..., description="Photo of the crochet item"),
    dimensions: str = Form(..., description="Size, e.g. '12 cm tall'"),
    skip_youtube: bool = Form(False, description="Set true to skip YouTube step"),
) -> dict:
    """
    Starts the full price estimation pipeline in the background.
    Returns a job_id instantly to prevent Cloudflare 524 timeouts.
    """
    image_bytes = await image.read()
    job_id = str(uuid.uuid4())
    
    jobs[job_id] = {"status": "pending"}
    background_tasks.add_task(process_estimate_job, job_id, image_bytes, dimensions, skip_youtube)
    
    return {"job_id": job_id, "status": "pending"}

@app.get("/estimate/{job_id}")
async def get_estimate(job_id: str) -> dict:
    """
    Poll this endpoint to check if the job is completed.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=API_PORT, reload=False)
