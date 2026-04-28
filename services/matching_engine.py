import io
import os
import logging
from typing import Optional

import numpy as np
import requests
from PIL import Image
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Initialize the model globally
try:
    model = SentenceTransformer('clip-ViT-B-32')
except Exception as e:
    logger.error(f"Failed to load sentence-transformers model: {e}")
    model = None

_cached_target_embeddings = []

def initialize_ground_truth():
    global _cached_target_embeddings
    _cached_target_embeddings = []
    
    if model is None:
        logger.error("Model is not initialized.")
        return
    
    # Path to the official assets directory
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "official_assets")
    
    # Ensure directory exists
    if not os.path.exists(assets_dir):
        logger.warning(f"Official assets directory not found at {assets_dir}. Creating it...")
        os.makedirs(assets_dir, exist_ok=True)
        
    # Find all valid images
    valid_extensions = ('.jpg', '.jpeg', '.png')
    image_files = [
        f for f in os.listdir(assets_dir) 
        if f.lower().endswith(valid_extensions)
    ]
    
    # If empty, create a dummy asset
    if not image_files:
        logger.warning("No official assets found. Creating a dummy asset for testing.")
        dummy_path = os.path.join(assets_dir, "dummy_asset.jpg")
        dummy_img = Image.new('RGB', (224, 224), color=(73, 109, 137))
        dummy_img.save(dummy_path)
        image_files = ["dummy_asset.jpg"]
        
    for image_file in image_files:
        path = os.path.join(assets_dir, image_file)
        try:
            img = Image.open(path)
            embedding = model.encode(img)
            _cached_target_embeddings.append(embedding)
        except Exception as e:
            logger.error(f"Error loading asset {image_file}: {e}")
            
    if _cached_target_embeddings:
        logger.info(f"Successfully initialized {len(_cached_target_embeddings)} reference embeddings.")
    else:
        logger.error("Failed to initialize any reference embeddings.")

def download_image_to_memory(url: str) -> Image.Image:
    # Check if the "url" is actually a local file path for easier testing
    if os.path.exists(url):
        try:
            return Image.open(url).convert('RGB')
        except Exception as e:
            logger.error(f"Failed to load local image from {url}: {e}")
            return None
            
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content)).convert('RGB')
        return img
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        return None

def calculate_similarity(image: Image.Image) -> float:
    if model is None or not _cached_target_embeddings:
        logger.error("Engine not properly initialized or no reference embeddings available.")
        return 0.0
    try:
        embedding = model.encode(image)
        # Calculate similarities against all reference embeddings at once
        similarities = cosine_similarity([embedding], _cached_target_embeddings)[0]
        max_similarity = float(np.max(similarities))
        return max_similarity
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        return 0.0


# ──────────────────────────────────────────────
# Standalone vector-vs-vector match score
# ──────────────────────────────────────────────
def calculate_match_score(
    stream_vector: np.ndarray,
    official_vector: np.ndarray,
) -> float:
    """
    Compute cosine similarity between two CLIP embedding vectors
    and return a percentage score (0–100).

    Parameters
    ----------
    stream_vector : np.ndarray
        The 512-d "Stream Signature" vector from UniversalSampler.
    official_vector : np.ndarray
        The reference embedding of the official asset.

    Returns
    -------
    float
        Similarity as a percentage, e.g. 94.2
    """
    if stream_vector is None or official_vector is None:
        logger.error("Cannot compute match score: one or both vectors are None.")
        return 0.0
    try:
        # Reshape to 2-D for sklearn
        sv = np.array(stream_vector).reshape(1, -1)
        ov = np.array(official_vector).reshape(1, -1)
        sim = cosine_similarity(sv, ov)[0][0]
        # Clamp into [0, 1] and convert to percentage
        return round(float(max(0, min(1, sim))) * 100, 2)
    except Exception as e:
        logger.error(f"calculate_match_score failed: {e}")
        return 0.0


# ──────────────────────────────────────────────
# Vector Vault search  (pgvector / Supabase)
# ──────────────────────────────────────────────
async def search_vault(
    pirate_vector: np.ndarray,
    match_id: Optional[str] = None,
    broadcaster_id: Optional[str] = None,
    top_k: int = 1,
) -> Optional[dict]:
    """
    Query the `official_asset_vectors` pgvector table for the nearest
    official embedding to `pirate_vector` using cosine distance (<=>).
    Scoped by broadcaster_id and optionally match_id to prevent leakage.
    """
    try:
        from database import AsyncSessionLocal

        # Serialize numpy array → PostgreSQL vector literal
        vec_str = "[" + ",".join(str(float(v)) for v in pirate_vector.tolist()) + "]"

        # Build the similarity query with 2-layer filtering
        clauses = []
        params = {"query_vector": vec_str, "top_k": top_k}
        
        if broadcaster_id:
            clauses.append("broadcaster_id = :broadcaster_id")
            params["broadcaster_id"] = broadcaster_id
            
        if match_id:
            clauses.append("match_id = :match_id")
            params["match_id"] = match_id

        where_clause = "WHERE " + " AND ".join(clauses) if clauses else ""
        
        sql = text(f"""
            SELECT
                id,
                match_id,
                broadcaster_id,
                timestamp,
                is_static_ref,
                (vector <=> CAST(:query_vector AS vector)) AS cosine_distance
            FROM official_asset_vectors
            {where_clause}
            ORDER BY cosine_distance ASC
            LIMIT :top_k
        """)

        async with AsyncSessionLocal() as session:
            result = await session.execute(sql, params)
            rows = result.fetchall()

        if not rows:
            logger.warning("[VaultSearch] No vectors found in the vault.")
            return None

        best = rows[0]
        cosine_distance = float(best.cosine_distance)
        # cosine distance ∈ [0, 2]; convert to similarity percentage
        similarity_pct = round(max(0.0, 1.0 - cosine_distance) * 100, 2)

        return {
            "id": best.id,
            "score": similarity_pct,
            "match_id": best.match_id,
            "broadcaster_id": best.broadcaster_id,
            "timestamp": best.timestamp,
            "is_static_ref": best.is_static_ref,
            "vault_distance": cosine_distance,
        }

    except Exception as exc:
        logger.error(f"[VaultSearch] search_vault failed: {exc}")
        return None

async def flag_highlight(vector_id, engagement_score: int) -> bool:
    """
    Update the official ledger when a viral fan-edit matches an official vector.
    Sets is_highlight = True and adds social media engagement metrics.
    """
    try:
        from database import AsyncSessionLocal
        
        sql = text("""
            UPDATE official_asset_vectors
            SET is_highlight = True,
                viral_engagement_score = COALESCE(viral_engagement_score, 0) + :engagement
            WHERE id = :id
        """)
        
        async with AsyncSessionLocal() as session:
            await session.execute(sql, {"id": vector_id, "engagement": engagement_score})
            await session.commit()
        return True
    except Exception as exc:
        logger.error(f"[VaultSearch] flag_highlight failed: {exc}")

async def evaluate_suspect_sequence(suspect_vectors: list) -> dict:
    """
    3-Tier Confidence Matching Pipeline
    Tier 1 (HNSW Vector Search): Check first vector > 70% (Global Search across all tenants)
    Tier 2 (Temporal Sequence): Check remaining vectors > 80% (Scoped to identified tenant)
    
    SPECIAL CASE: If the matched vector is a "Static Reference" (e.g. poster/key art),
    we trigger a match immediately without requiring a temporal sequence.
    """
    if not suspect_vectors:
        return {"is_verified_match": False, "average_score": 0.0, "matched_official_uuid": None}
        
    # Tier 1: Global search to identify the likely broadcaster/match
    t1_match = await search_vault(suspect_vectors[0])
    if not t1_match or t1_match["score"] < 70.0:
        avg_score = t1_match["score"] if t1_match else 0.0
        return {"is_verified_match": False, "average_score": avg_score}

    # --- Static Reference Short-Circuit ---
    if t1_match.get("is_static_ref"):
        logger.info(f"[MatchingEngine] 🎯 FAST-MATCH: Static reference link found ({t1_match['match_id']})")
        return {
            "is_verified_match": True,
            "average_score": t1_match["score"],
            "matched_official_uuid": t1_match["id"],
            "broadcaster_id": t1_match["broadcaster_id"],
            "matched_timestamp": t1_match["timestamp"]
        }

    scores = [t1_match["score"]]
    matched_id = t1_match["id"]
    match_group_id = t1_match["match_id"]
    broadcaster_id = t1_match["broadcaster_id"]
    
    # Tier 2 Sequential Guard: Scope to original match AND broadcaster
    import asyncio
    
    async def _check_vec(v):
        res = await search_vault(v, match_id=match_group_id, broadcaster_id=broadcaster_id)
        return res["score"] if res else 0.0
        
    tasks = [_check_vec(v) for v in suspect_vectors[1:]]
    if tasks:
        t2_scores = await asyncio.gather(*tasks)
        scores.extend(t2_scores)
        
    matches_above_80 = sum(1 for s in scores if s > 80.0)
    is_verified = matches_above_80 >= 2
    avg_score = sum(scores) / len(scores)
    
    return {
        "is_verified_match": is_verified,
        "average_score": avg_score,
        "matched_official_uuid": matched_id if is_verified else None,
        "broadcaster_id": broadcaster_id if is_verified else None,
        "matched_timestamp": t1_match["timestamp"] if is_verified else None
    }

