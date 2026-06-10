"""
vision.py — Step 1 & 2 of the pipeline.

Step 1: Vision LLM looks at the photo and describes the crochet item.
Step 2: Text LLM cleans that description into search-friendly keywords.
"""
from __future__ import annotations

import base64
import ollama

from config import OLLAMA_HOST, VISION_MODEL, TEXT_MODEL


def _client() -> ollama.Client:
    return ollama.Client(host=OLLAMA_HOST)


def describe_item(image_bytes: bytes) -> str:
    """
    Send the image to the vision model and get a structured description.
    Accepts raw image bytes — works from both CLI and web uploads.
    """
    client = _client()
    
    # Ollama vision models (like llava) only reliably support JPEG/PNG.
    # We must convert images like .webp to JPEG before sending.
    from PIL import Image
    from io import BytesIO
    with Image.open(BytesIO(image_bytes)) as img:
        img = img.convert("RGB")
        out = BytesIO()
        img.save(out, format="JPEG")
        jpg_bytes = out.getvalue()
        
    b64 = base64.b64encode(jpg_bytes).decode()
    prompt = (
        "Look at this handmade crochet item carefully.\n"
        "Respond in this exact format (one line each, no extra text):\n"
        "Object: <what it is>\n"
        "Craft: <crochet / amigurumi / etc>\n"
        "Subject: <animal / food / character / etc>\n"
        "Features: <distinctive shapes, details>\n"
        "Colors: <main colors>\n"
        "Apparent size: <tiny / small / medium / large>"
    )
    res = client.chat(
        model=VISION_MODEL,
        messages=[{"role": "user", "content": prompt, "images": [b64]}],
    )
    return res["message"]["content"].strip()


def extract_keywords(description: str) -> str:
    """
    Turn the structured description into comma-separated search keywords
    that someone would type when searching for a crochet pattern or listing.
    Returns: "amigurumi turtle, sea turtle crochet pattern, turtle plushie"
    """
    client = _client()
    prompt = (
        "Extract crochet pattern search terms from the description below.\n\n"
        "Rules:\n"
        "- Output ONLY a single comma-separated line of keywords.\n"
        "- No explanations, no bullet points, no markdown.\n"
        "- Include: item type, subject, style, distinctive features.\n"
        "- Avoid generic terms like 'handcrafted', 'yarn', 'crochet' unless essential.\n"
        "- Include terms someone would type to find a pattern or buy this item.\n\n"
        "Example output:\n"
        "amigurumi turtle, sea turtle crochet pattern, turtle plushie, crochet sea turtle\n\n"
        f"Description:\n{description}"
    )
    res = client.chat(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return res["message"]["content"].strip()


def describe_and_extract(image_bytes: bytes) -> tuple[str, str]:
    """Convenience: run both steps, return (description, keywords)."""
    description = describe_item(image_bytes)
    keywords = extract_keywords(description)
    return description, keywords


def describe_and_extract_from_path(image_path: str) -> tuple[str, str]:
    """CLI helper: read file from disk then run the pipeline."""
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    return describe_and_extract(image_bytes)
