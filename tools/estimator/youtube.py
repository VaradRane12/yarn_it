"""
youtube.py — Step 3A of the pipeline.

Uses the YouTube Data API v3 to search for tutorial videos, then for each:
  1. Fetches the video description + spoken transcript
  2. Sends both to the Ollama LLM to extract crochet data
     (hook size, yarn weight/grams/meters, time to make, safety eyes)

Transcripts are the richest signal — creators often say things out loud
(yarn amounts, time taken) that never appear in the description.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional

import ollama
import requests
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

from config import OLLAMA_HOST, TEXT_MODEL, YOUTUBE_API_KEY


@dataclass
class VideoInsights:
    video_id: str
    title: str
    duration_seconds: int = 0
    hook_mm: Optional[float] = None
    yarn_weights: list[str] = field(default_factory=list)
    yarn_grams: Optional[int] = None
    yarn_meters: Optional[int] = None
    hours_low: Optional[float] = None
    hours_high: Optional[float] = None
    safety_eyes_mm: Optional[int] = None


def _client() -> ollama.Client:
    return ollama.Client(host=OLLAMA_HOST)


def _parse_iso_duration(iso: str) -> int:
    """Convert YouTube ISO 8601 duration (PT4M13S) to seconds."""
    import re
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not m:
        return 0
    h, mn, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mn * 60 + s


def _fetch_transcript(video_id: str) -> str:
    """
    Fetch the full spoken transcript for a video.
    Returns empty string if unavailable (not all videos have captions).
    """
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        return " ".join(s.text for s in transcript.snippets)
    except (NoTranscriptFound, TranscriptsDisabled, Exception):
        return ""


def _extract_with_llm(title: str, description: str, transcript: str) -> dict:
    """
    Send the video title, description, and transcript to Ollama and ask it
    to extract crochet-relevant data as JSON.
    """
    client = _client()

    # Combine all text sources — transcript is the richest signal
    combined = f"""Title: {title}

Description:
{description[:1500]}

Spoken transcript:
{transcript[:3000] if transcript else "(no transcript available)"}"""

    prompt = f"""You are analysing a YouTube crochet tutorial video.
Extract the following information from the title, description, and spoken transcript below.
The transcript contains what the creator said out loud — it often has the most useful detail.
Respond with ONLY a valid JSON object — no explanation, no markdown fences.

Fields to extract (use null if not mentioned):
- hook_mm: hook size in millimetres (number, e.g. 3.5)
- yarn_weight: yarn weight/type (e.g. "dk", "worsted", "cotton", "acrylic") or null
- yarn_grams: grams of yarn needed (integer) or null
- yarn_meters: meters of yarn needed (integer) or null
- hours_low: minimum hours to make this item (number) or null
- hours_high: maximum hours to make this item (number) or null
- safety_eyes_mm: safety eye size in mm (integer) or null

{combined}

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
        print(f"[youtube] LLM parse failed: {e}")
        return {}


def search_youtube_tutorials(keywords: str, max_results: int = 5) -> list[VideoInsights]:
    """
    Search YouTube for crochet pattern tutorials matching the keywords.
    Uses the YouTube Data API for video metadata, then Ollama to extract
    crochet data from the title + description.

    Returns empty list if no API key is configured.
    """
    if not YOUTUBE_API_KEY:
        print("[youtube] No YOUTUBE_API_KEY set — skipping YouTube step.")
        return []

    search_query = f"{keywords} crochet pattern tutorial"

    # 1. Search for videos
    search_resp = requests.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "part": "snippet",
            "q": search_query,
            "type": "video",
            "maxResults": max_results,
            "relevanceLanguage": "en",
            "key": YOUTUBE_API_KEY,
        },
        timeout=10,
    )
    search_resp.raise_for_status()
    items = search_resp.json().get("items", [])
    if not items:
        return []

    video_ids = [item["id"]["videoId"] for item in items]

    # 2. Fetch full video details (description + duration)
    details_resp = requests.get(
        "https://www.googleapis.com/youtube/v3/videos",
        params={
            "part": "snippet,contentDetails",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY,
        },
        timeout=10,
    )
    details_resp.raise_for_status()
    details = {v["id"]: v for v in details_resp.json().get("items", [])}

    # 3. For each video: fetch transcript + send everything to LLM
    results: list[VideoInsights] = []
    for vid_id in video_ids:
        detail = details.get(vid_id)
        if not detail:
            continue

        title = detail["snippet"].get("title", "")
        description = detail["snippet"].get("description", "")
        duration_s = _parse_iso_duration(detail["contentDetails"].get("duration", "PT0S"))

        transcript = _fetch_transcript(vid_id)
        has_transcript = "✓" if transcript else "✗"
        print(f"[youtube] transcript {has_transcript}  {title[:50]}")

        extracted = _extract_with_llm(title, description, transcript)

        ins = VideoInsights(
            video_id=vid_id,
            title=title,
            duration_seconds=duration_s,
            hook_mm=extracted.get("hook_mm"),
            yarn_weights=[extracted["yarn_weight"]] if extracted.get("yarn_weight") else [],
            yarn_grams=extracted.get("yarn_grams"),
            yarn_meters=extracted.get("yarn_meters"),
            hours_low=extracted.get("hours_low"),
            hours_high=extracted.get("hours_high"),
            safety_eyes_mm=extracted.get("safety_eyes_mm"),
        )
        results.append(ins)
        print(f"[youtube] ✓ {title[:55]:<55} "
              f"hook:{ins.hook_mm}mm  "
              f"yarn:{ins.yarn_grams}g/{ins.yarn_meters}m  "
              f"hours:{ins.hours_low}-{ins.hours_high}")

    return results
