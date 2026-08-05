"""
Embedding_service.py
Generates Transformer embeddings using the singleton SentenceTransformer model
and SQLite/RAM cache service.
"""

from typing import List, Union
import numpy as np
from model_loader import model_loader
from cache_service import cache_service
from config import DEFAULT_EMBEDDING_MODEL
from logging_service import logger


class EmbeddingInferenceService:
    """Production vector embedding inference service."""

    def __init__(self):
        self.model_loader = model_loader

    def get_embedding(self, text: str) -> np.ndarray:
        """Encodes a single text string into a 1D NumPy float32 vector."""
        model_name = self.model_loader.metadata.get("embedding_model", DEFAULT_EMBEDDING_MODEL)

        # 1. Cache Check
        cached = cache_service.get_embedding(text, model_name)
        if cached is not None:
            return cached

        # 2. Compute Embedding via Singleton Model
        transformer = self.model_loader.transformer
        if transformer is None:
            raise RuntimeError("Transformer model is not loaded in model_loader.")

        vector = transformer.encode(text, show_progress_bar=False)

        # 3. Save to Cache
        cache_service.save_embedding(text, vector, model_name)
        return vector

    def get_batch_embeddings(self, texts: List[str], batch_size: int = 256) -> np.ndarray:
        """Encodes a list of texts into a 2D NumPy array of embeddings."""
        if not texts:
            return np.empty((0, 384))

        model_name = self.model_loader.metadata.get("embedding_model", DEFAULT_EMBEDDING_MODEL)
        results = []
        missing_indices = []
        missing_texts = []

        for i, text in enumerate(texts):
            cached = cache_service.get_embedding(text, model_name)
            if cached is not None:
                results.append((i, cached))
            else:
                missing_indices.append(i)
                missing_texts.append(text)

        if missing_texts:
            transformer = self.model_loader.transformer
            if transformer is None:
                raise RuntimeError("Transformer model is not loaded in model_loader.")

            logger.debug(f"Computing embeddings for {len(missing_texts)} missing items...")
            new_vectors = transformer.encode(missing_texts, batch_size=batch_size, show_progress_bar=False)

            for idx, text, vec in zip(missing_indices, missing_texts, new_vectors):
                cache_service.save_embedding(text, vec, model_name)
                results.append((idx, vec))

        # Re-sort into original text list order
        results.sort(key=lambda x: x[0])
        return np.array([vec for _, vec in results])


embedding_service = EmbeddingInferenceService()
