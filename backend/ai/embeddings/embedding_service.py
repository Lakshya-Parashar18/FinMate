"""
Embedding_service.py
Centralized embedding service serving vector representations across all AI platform modules.
"""

from typing import List, Union, Dict
import numpy as np
from sentence_transformers import SentenceTransformer
from embeddings.embedding_store import embedding_store
from config.platform_config import DEFAULT_EMBEDDING_MODEL, MAX_RAM_CACHE_ENTRIES
from ai_utils.logger import logger


class PlatformEmbeddingService:
    """Centralized vector embedding service with RAM LRU + SQLite persistent store."""

    def __init__(self, default_model: str = DEFAULT_EMBEDDING_MODEL):
        self.default_model_name = default_model
        self._loaded_models: Dict[str, SentenceTransformer] = {}
        self._ram_cache: Dict[str, np.ndarray] = {}

    def _get_model(self, model_name: str) -> SentenceTransformer:
        if model_name not in self._loaded_models:
            logger.info(f"Loading SentenceTransformer model into RAM: {model_name}...")
            self._loaded_models[model_name] = SentenceTransformer(model_name)
        return self._loaded_models[model_name]

    def encode_single(self, text: str, model_name: str = DEFAULT_EMBEDDING_MODEL) -> np.ndarray:
        key = f"{model_name}:{text}"
        if key in self._ram_cache:
            return self._ram_cache[key]

        cached = embedding_store.get_vector(text, model_name)
        if cached is not None:
            self._put_ram(key, cached)
            return cached

        transformer = self._get_model(model_name)
        vector = transformer.encode(text, show_progress_bar=False)

        embedding_store.save_vector(text, vector, model_name)
        self._put_ram(key, vector)
        return vector

    def encode_batch(self, texts: List[str], model_name: str = DEFAULT_EMBEDDING_MODEL, batch_size: int = 256) -> np.ndarray:
        if not texts:
            return np.empty((0, 384))

        results = []
        missing_indices = []
        missing_texts = []

        for idx, text in enumerate(texts):
            key = f"{model_name}:{text}"
            if key in self._ram_cache:
                results.append((idx, self._ram_cache[key]))
            else:
                cached = embedding_store.get_vector(text, model_name)
                if cached is not None:
                    self._put_ram(key, cached)
                    results.append((idx, cached))
                else:
                    missing_indices.append(idx)
                    missing_texts.append(text)

        if missing_texts:
            transformer = self._get_model(model_name)
            new_vectors = transformer.encode(missing_texts, batch_size=batch_size, show_progress_bar=False)
            for idx, text, vec in zip(missing_indices, missing_texts, new_vectors):
                key = f"{model_name}:{text}"
                embedding_store.save_vector(text, vec, model_name)
                self._put_ram(key, vec)
                results.append((idx, vec))

        results.sort(key=lambda x: x[0])
        return np.array([vec for _, vec in results])

    def _put_ram(self, key: str, vector: np.ndarray):
        if len(self._ram_cache) >= MAX_RAM_CACHE_ENTRIES:
            first_key = next(iter(self._ram_cache))
            del self._ram_cache[first_key]
        self._ram_cache[key] = vector


platform_embedding_service = PlatformEmbeddingService()
