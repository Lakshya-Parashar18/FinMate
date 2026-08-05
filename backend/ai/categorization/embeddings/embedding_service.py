"""
Embedding_service.py
Encodes text into dense vector embeddings using SentenceTransformers (all-MiniLM-L6-v2)
with automatic embedding cache lookup to ensure zero redundant recomputation.
"""

from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
from embeddings.embedding_store import EmbeddingStore
from embeddings.embedding_cache import EmbeddingCache
from engine_utils.config import DEFAULT_EMBEDDING_MODEL
from engine_utils.logger import logger


class EmbeddingService:
    """Production Transformer Embedding Service with persistent caching."""

    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL, use_cache: bool = True):
        self.model_name = model_name
        self.use_cache = use_cache

        logger.info(f"Loading SentenceTransformer model: {self.model_name}...")
        self.model = SentenceTransformer(self.model_name)

        if self.use_cache:
            self.store = EmbeddingStore()
            self.cache = EmbeddingCache(self.store)
        else:
            self.cache = None

    def encode(self, texts: Union[str, List[str]], batch_size: int = 256) -> np.ndarray:
        """
        Encodes single text or list of texts into a 2D NumPy array of embeddings.
        Utilizes caching to fetch existing embeddings instantly.
        """
        is_single = isinstance(texts, str)
        text_list = [texts] if is_single else texts

        if not text_list:
            return np.empty((0, self.model.get_sentence_embedding_dimension()))

        if not self.use_cache:
            embeddings = self.model.encode(text_list, batch_size=batch_size, show_progress_bar=False)
            return embeddings[0] if is_single else embeddings

        # 1. Lookup in Cache
        cached_found, missing_texts = self.cache.get_batch(text_list, self.model_name)

        # 2. Compute missing embeddings if any
        if missing_texts:
            logger.debug(f"Cache miss for {len(missing_texts)} / {len(text_list)} texts. Computing transformer embeddings...")
            new_embeddings = self.model.encode(missing_texts, batch_size=batch_size, show_progress_bar=False)

            pairs_to_save = list(zip(missing_texts, new_embeddings))
            self.cache.put_batch(pairs_to_save, self.model_name)

            for t, emb in pairs_to_save:
                cached_found[t] = emb

        # 3. Assemble embeddings in original list order
        ordered_embeddings = [cached_found[t] for t in text_list]
        result = np.array(ordered_embeddings)

        return result[0] if is_single else result
