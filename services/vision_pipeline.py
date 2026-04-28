"""
Aegis Universal Sampler — 4-stage async vision pipeline.

Stage 1: Traffic Controller (URL routing)
Stage 2: Adapters (Social / Direct / Rogue)
Stage 3: Slicer (ffmpeg frame extraction)
Stage 4: Vectorization (CLIP embedding → mean vector)
"""

import asyncio
import os
import re
import tempfile
import uuid
import logging
import subprocess
from typing import Optional

import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Lazy model singleton — reuses matching_engine's
# ──────────────────────────────────────────────
_clip_model: Optional[SentenceTransformer] = None


def _get_clip_model() -> SentenceTransformer:
    global _clip_model
    if _clip_model is None:
        logger.info("[VisionPipeline] Loading CLIP model clip-ViT-B-32 …")
        _clip_model = SentenceTransformer("clip-ViT-B-32")
    return _clip_model


# ──────────────────────────────────────────────
# STAGE 1 — Traffic Controller
# ──────────────────────────────────────────────
_SOCIAL_PATTERNS = re.compile(
    r"(youtube\.com|youtu\.be|twitter\.com|x\.com|instagram\.com|tiktok\.com)",
    re.IGNORECASE,
)
_DIRECT_EXTENSIONS = re.compile(r"\.(m3u8|mp4|ts|mkv)(\?|$)", re.IGNORECASE)


def _classify_url(url: str) -> str:
    """Return 'social', 'direct', or 'rogue'."""
    if _SOCIAL_PATTERNS.search(url):
        return "social"
    if _DIRECT_EXTENSIONS.search(url):
        return "direct"
    # Local file paths
    if os.path.exists(url):
        return "direct"
    return "rogue"


# ──────────────────────────────────────────────
# STAGE 2 — Adapters
# ──────────────────────────────────────────────
async def _social_adapter(url: str) -> str:
    """
    Use yt-dlp in a thread to extract the raw video URL
    without actually downloading the file (--get-url).
    """

    def _extract():
        try:
            result = subprocess.run(
                ["yt-dlp", "--get-url", "--no-warnings", "-f", "best", url],
                capture_output=True,
                text=True,
                timeout=30,
            )
            extracted = result.stdout.strip().split("\n")[0]
            if extracted:
                return extracted
        except FileNotFoundError:
            logger.warning("[SocialAdapter] yt-dlp not installed, falling back to direct URL.")
        except subprocess.TimeoutExpired:
            logger.warning("[SocialAdapter] yt-dlp timed out.")
        except Exception as e:
            logger.warning(f"[SocialAdapter] yt-dlp error: {e}")
        return url  # fallback: return original

    return await asyncio.to_thread(_extract)


async def _rogue_adapter(url: str) -> str:
    """
    Use Playwright headless to load a rogue page, sniff network
    traffic for a streaming manifest (.m3u8 / .mp4), and return
    the extracted media URL.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("[RogueAdapter] Playwright not installed, returning original URL.")
        return url

    intercepted_url: Optional[str] = None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            async def _on_request(request):
                nonlocal intercepted_url
                if re.search(r"\.(m3u8|mp4)", request.url, re.IGNORECASE):
                    intercepted_url = request.url

            page.on("request", _on_request)

            try:
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                # Give some time for dynamic requests to fire
                await asyncio.sleep(3)
            except Exception:
                pass  # page may timeout, but we could still have intercepted

            await browser.close()
    except Exception as e:
        logger.warning(f"[RogueAdapter] Playwright session error: {e}")

    return intercepted_url or url


async def _direct_adapter(url: str) -> str:
    """Pass-through for direct media URLs and local paths."""
    return url


# ──────────────────────────────────────────────
# STAGE 3 — Slicer  (ffmpeg subprocess)
# ──────────────────────────────────────────────
async def _slice_frames(media_url: str, timestamps: list[float] = [0.0, 5.0, 10.0]) -> list[str]:
    """
    Extract frames at specific timestamps using ffmpeg.
    Returns a list of temporary JPEG file paths.
    """
    frame_paths: list[str] = []
    tmp_dir = tempfile.mkdtemp(prefix="aegis_frames_")

    for ts in timestamps:
        out_path = os.path.join(tmp_dir, f"frame_{uuid.uuid4().hex[:8]}_{ts:.0f}s.jpg")

        cmd = [
            "ffmpeg",
            "-ss", str(ts),
            "-i", media_url,
            "-frames:v", "1",
            "-q:v", "2",
            "-y",
            out_path,
        ]

        def _run_ffmpeg(_cmd=cmd):
            try:
                subprocess.run(
                    _cmd,
                    capture_output=True,
                    timeout=20,
                )
            except subprocess.TimeoutExpired:
                logger.warning(f"[Slicer] ffmpeg timed out for T={ts}s")
            except Exception as e:
                logger.warning(f"[Slicer] ffmpeg error: {e}")

        await asyncio.to_thread(_run_ffmpeg)

        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            frame_paths.append(out_path)
        else:
            logger.warning(f"[Slicer] Frame at T={ts}s was not extracted.")

    return frame_paths


# ──────────────────────────────────────────────
# STAGE 4 — Vectorization
# ──────────────────────────────────────────────
async def _vectorize_frames(frame_paths: list[str]) -> Optional[list[np.ndarray]]:
    """
    Encode each frame with CLIP, return an array of 512-dimensional vectors.
    Cleans up temporary files after vectorization.
    """
    if not frame_paths:
        logger.error("[Vectorizer] No frames to vectorize.")
        return None

    model = _get_clip_model()
    embeddings: list[np.ndarray] = []

    def _encode_all():
        for fp in frame_paths:
            try:
                img = Image.open(fp).convert("RGB")
                emb = model.encode(img)
                embeddings.append(emb)
            except Exception as e:
                logger.warning(f"[Vectorizer] Failed to encode {fp}: {e}")

    await asyncio.to_thread(_encode_all)

    # ── Cleanup temp files ──
    for fp in frame_paths:
        try:
            os.remove(fp)
        except OSError:
            pass
    # Remove the temp directory if empty
    for fp in frame_paths:
        parent = os.path.dirname(fp)
        try:
            os.rmdir(parent)
        except OSError:
            pass

    if not embeddings:
        logger.error("[Vectorizer] All frames failed to encode.")
        return None

    logger.info(f"[Vectorizer] Extracted and generated {len(embeddings)} sequential vectors.")
    return embeddings


# ══════════════════════════════════════════════
# PUBLIC API — UniversalSampler
# ══════════════════════════════════════════════
class UniversalSampler:
    """
    Accepts a raw URL, resolves it through adapters, extracts
    frames with ffmpeg, and returns a normalised CLIP embedding
    (the "Stream Signature" vector).
    """

    async def sample(self, url: str) -> dict:
        """
        Run the full 4-stage pipeline.

        Returns
        -------
        dict with keys:
            route       : str   — which adapter was used
            resolved_url: str   — the resolved media URL
            vector      : np.ndarray | None — 512-d mean embedding
            frame_count : int   — how many frames were successfully encoded
        """
        # Stage 1 — classify
        route = _classify_url(url)
        logger.info(f"[UniversalSampler] URL classified as '{route}': {url[:80]}")

        # Stage 2 — resolve
        if route == "social":
            resolved = await _social_adapter(url)
        elif route == "rogue":
            resolved = await _rogue_adapter(url)
        else:
            resolved = await _direct_adapter(url)

        logger.info(f"[UniversalSampler] Resolved to: {resolved[:120]}")

        # Stage 3 — extract frames
        frame_paths = await _slice_frames(resolved)
        logger.info(f"[UniversalSampler] Extracted {len(frame_paths)} frames")

        # Stage 4 — vectorize
        vectors = await _vectorize_frames(frame_paths)

        return {
            "route": route,
            "resolved_url": resolved,
            "vectors": vectors,
            "frame_count": len(frame_paths) if vectors is not None else 0,
        }
