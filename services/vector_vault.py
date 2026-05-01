import io
import torch
import numpy as np
from PIL import Image
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from database import AsyncSessionLocal, OfficialAssetVector

class CLIPVectorizer:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            print("[CLIPVectorizer] Loading model CLIP-ViT-B-32 into memory...")
            cls._instance = super(CLIPVectorizer, cls).__new__(cls)
            # Load the model once
            cls._instance.model = SentenceTransformer('clip-ViT-B-32')
            if torch.cuda.is_available():
                cls._instance.model = cls._instance.model.to('cuda')
            print("[CLIPVectorizer] Model loaded successfully.")
        return cls._instance

    def vectorize(self, png_bytes: bytearray) -> np.ndarray:
        """
        Converts raw PNG buffer into a normalized 512-d vector.
        """
        image = Image.open(io.BytesIO(png_bytes)).convert("RGB")
        # Encode returns a numpy array. We want it normalized for cosine similarity.
        embedding = self.model.encode(image, normalize_embeddings=True)
        return embedding

class VaultSearch:
    @staticmethod
    async def find_nearest(vector: np.ndarray, top_k: int = 1):
        """
        Performs a nearest-neighbor search in PostgreSQL using Cosine Distance.
        """
        async with AsyncSessionLocal() as session:
            # <=> is the cosine distance operator in pgvector
            query = (
                select(
                    OfficialAssetVector,
                    (OfficialAssetVector.vector.cosine_distance(vector)).label("distance")
                )
                .order_by("distance")
                .limit(top_k)
            )
            
            result = await session.execute(query)
            best_match = result.first()
            
            if best_match:
                asset, distance = best_match
                # Similarity = 1 - Distance
                similarity = 1 - distance
                return {
                    "asset": asset,
                    "similarity": float(similarity)
                }
            return None
