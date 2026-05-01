import os
import json
import logging
from PIL import Image
from google import genai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

genai_api_key = os.getenv("GEMINI_API_KEY")
client = None
if genai_api_key:
    client = genai.Client(api_key=genai_api_key)
else:
    logger.warning("GEMINI_API_KEY environment variable is missing.")

def adjudicate_edge_case(image: Image.Image, post_text: str) -> dict:
    if client is None:
        return {
            "is_pirated": False,
            "classification": "Error: Gemini client not initialized",
            "recommended_action": "NONE",
            "reasoning": "Gemini API key missing, cannot adjudicate."
        }
        
    prompt = (
        f"You are an enterprise copyright AI. Analyze this image and the user post text: '{post_text}'. "
        "Determine if this is unauthorized use of official sports media. If it is, classify the threat. "
        "1. 'Hostile Piracy': Explicit live streams or full unedited broadcasts. "
        "2. 'Viral Fan Edit': Heavily edited clips, montages, or memes. "
        "Respond strictly in JSON with three keys: 'is_pirated' (boolean), 'classification' (string), "
        "and 'recommended_action' (must be either 'ISSUE DMCA TAKEDOWN' or 'CLAIM MONETIZATION'). "
        "Include a fourth key 'reasoning' (string)."
    )

    try:
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=[image, prompt],
        )
        
        # Parse text into JSON, stripping potential markdown
        text_response = response.text
        if text_response.startswith('```json'):
            text_response = text_response.strip('```json').strip('```').strip()
        elif text_response.startswith('```'):
            text_response = text_response.strip('```').strip()
            
        data = json.loads(text_response)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response from Gemini: {e}")
        return {
            "is_pirated": False,
            "classification": "Error: Invalid JSON response",
            "recommended_action": "NONE",
            "reasoning": f"Gemini response did not contain valid JSON."
        }
    except Exception as e:
        logger.error(f"AI arbiter failed: {e}")
        return {
            "is_pirated": False,
            "classification": "Error: API call failed",
            "recommended_action": "NONE",
            "reasoning": f"Error occurred during Gemini computation: {str(e)}"
        }


# ══════════════════════════════════════════════
# Async Stream Adjudication — with Safety Net
# ══════════════════════════════════════════════
import asyncio
from typing import Optional


async def adjudicate_stream(
    url: str,
    platform: str,
    similarity_score: float,
    metadata: Optional[dict] = None,
) -> dict:
    """
    Adjudicate a suspected piracy stream.

    Primary: Uses Gemini API with a structured system prompt.
    Safety Net: Falls back to deterministic rules if API key is
    missing or the network call fails.

    Returns
    -------
    dict with keys: classification, confidence_score, action_taken, reasoning
    """
    metadata = metadata or {}

    # ── Primary Path: Live Gemini API ──
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and client:
        try:
            system_prompt = (
                "You are the Aegis AI Arbiter, a copyright enforcement engine for live sports media.\n"
                "Analyze the following suspected piracy signal and produce a JSON verdict.\n\n"
                f"SIGNAL DATA:\n"
                f"- URL: {url}\n"
                f"- Platform: {platform}\n"
                f"- CLIP Vector Similarity Score: {similarity_score:.1f}%\n"
                f"- Metadata: {json.dumps(metadata)}\n\n"
                "DECISION RULES:\n"
                "- If the content is a near-exact match (>85%) on a social platform (YouTube, Instagram, Twitter, TikTok), "
                "and metadata suggests viral editing or fan engagement, classify as 'Viral Fan Edit' with action 'Monetize'.\n"
                "- If the content is a near-exact match on an unregulated platform (Telegram, rogue web domain), "
                "classify as 'Hostile Piracy' with action 'Takedown'.\n"
                "- If the match is ambiguous (65-85%), classify as 'Edge Case' and provide nuanced reasoning.\n\n"
                "Respond ONLY with valid JSON containing these exact keys:\n"
                '  "classification": string (e.g. "Hostile Piracy", "Viral Fan Edit", "Edge Case", "Safe")\n'
                '  "confidence_score": number (0-100)\n'
                '  "action_taken": string (must be "Takedown" or "Monetize" or "Monitor")\n'
                '  "reasoning": string (2-3 sentence explanation)\n'
            )

            def _call_gemini():
                response = client.models.generate_content(
                    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                    contents=[system_prompt],
                )
                text = response.text
                # Strip markdown code fences if present
                if text.startswith("```json"):
                    text = text.strip("```json").strip("```").strip()
                elif text.startswith("```"):
                    text = text.strip("```").strip()
                return json.loads(text)

            result = await asyncio.to_thread(_call_gemini)

            # Validate required keys
            required = {"classification", "confidence_score", "action_taken", "reasoning"}
            if required.issubset(result.keys()):
                logger.info(f"[AI Arbiter] Gemini verdict: {result['action_taken']} ({result['classification']})")
                return result
            else:
                logger.warning(f"[AI Arbiter] Gemini returned incomplete keys: {result.keys()}")
                # Fall through to safety net

        except json.JSONDecodeError as e:
            logger.warning(f"[AI Arbiter] Gemini JSON parse error: {e}")
        except Exception as e:
            logger.warning(f"[AI Arbiter] Gemini API call failed, engaging safety net: {e}")

    # ── Safety Net: Deterministic Rules Engine ──
    logger.info("[AI Arbiter] Safety net active — using deterministic rules engine")

    # Simulate network latency for realistic UI pacing
    await asyncio.sleep(2.0)

    social_platforms = {"youtube", "instagram", "twitter", "tiktok", "x"}
    rogue_platforms = {"telegram", "web", "rogue", "reddit"}

    platform_lower = platform.lower()
    is_social = platform_lower in social_platforms
    is_rogue = platform_lower in rogue_platforms

    is_viral = any(
        kw in json.dumps(metadata).lower()
        for kw in ["edit", "viral", "montage", "compilation", "fan", "reaction", "meme"]
    )

    if similarity_score > 85:
        if is_social and is_viral:
            return {
                "classification": "Viral Fan Edit",
                "confidence_score": similarity_score,
                "action_taken": "Monetize",
                "reasoning": (
                    f"High similarity ({similarity_score:.1f}%) detected on {platform}, a regulated social platform. "
                    f"Metadata indicators suggest viral/fan-edited content. Recommended action: claim monetization "
                    f"to redirect revenue while preserving organic reach."
                ),
            }
        elif is_social:
            return {
                "classification": "Unauthorized Reupload",
                "confidence_score": similarity_score,
                "action_taken": "Monetize",
                "reasoning": (
                    f"High similarity ({similarity_score:.1f}%) on {platform}. The content appears to be a "
                    f"direct or lightly modified reupload. Monetization claim issued to capture revenue without "
                    f"triggering adversarial domain churn."
                ),
            }
        elif is_rogue:
            return {
                "classification": "Hostile Piracy",
                "confidence_score": similarity_score,
                "action_taken": "Takedown",
                "reasoning": (
                    f"High similarity ({similarity_score:.1f}%) detected on {platform}, an unregulated channel. "
                    f"Content is classified as hostile piracy. Automated DMCA takedown request dispatched to "
                    f"hosting provider and domain registrar."
                ),
            }
        else:
            return {
                "classification": "Suspected Piracy",
                "confidence_score": similarity_score,
                "action_taken": "Takedown",
                "reasoning": (
                    f"High similarity ({similarity_score:.1f}%) on unknown platform '{platform}'. "
                    f"Defaulting to takedown as a precautionary enforcement measure."
                ),
            }
    elif similarity_score > 65:
        return {
            "classification": "Edge Case",
            "confidence_score": similarity_score,
            "action_taken": "Monitor",
            "reasoning": (
                f"Moderate similarity ({similarity_score:.1f}%) detected on {platform}. "
                f"Signal is ambiguous — could be transformative fair use or partial piracy. "
                f"Flagged for manual review by rights holder."
            ),
        }
    else:
        return {
            "classification": "Safe",
            "confidence_score": similarity_score,
            "action_taken": "Monitor",
            "reasoning": (
                f"Low similarity ({similarity_score:.1f}%) on {platform}. "
                f"Content does not match official assets. No enforcement action required."
            ),
        }

