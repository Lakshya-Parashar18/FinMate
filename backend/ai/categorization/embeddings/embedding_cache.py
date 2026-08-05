"""
Embedding_cache.py
In-memory LRU cache combined with SQLite persistent storage for ultrafast embedding retrieval.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
from embeddings.embedding_store import EmbeddingStore


class EmbeddingCache:
    """Combines RAM LRU cache with SQLite database store."""

    def __init__(self, db_store: EmbeddingStore, max_ram_entries: int = 10000):
        self.store = db_store
        self.max_ram_entries = max_ram_entries
        self._ram_cache: Dict[str, np.ndarray] = {}

    def get(self, text: str, model_name: str) -> Optional[np.ndarray]:
        """Gets embedding from RAM cache or SQLite store."""
        key = f"{model_name}:{text}"
        if key in self._ram_cache:
            return self._ram_cache[key]

        emb = self.store.get_embedding(text, model_name)
        if emb is not None:
            self._put_ram(key, emb)
        return emb

    def get_batch(self, texts: List[str], model_name: str) -> Tuple[Dict[str, np.ndarray], List[str]]:
        """Gets batch of embeddings from RAM and SQLite store."""
        found: Dict[str, np.ndarray] = {}
        missing_for_db: List[str] = []

        for text in texts:
            key = f"{model_name}:{text}"
            if key in self._ram_cache:
                found[text] = self._ram_cache[key]
            else:
                missing_for_db.append(text)

        if missing_for_db:
            db_found, missing_final = self.store.get_batch_embeddings(missing_for_db, model_name)
            for t, emb in db_found.items():
                found[t] = emb
                self._put_ram(f"{model_name}:{t}", emb)
            return found, missing_final

        return found, []

    def put_batch(self, text_embedding_pairs: List[Tuple[str, np.ndarray]], model_name: str) -> None:
        """Saves batch embeddings to both RAM and SQLite store."""
        for t, emb in text_embedding_pairs:
            key = f"{model_name}:{t}"
            self._put_ram(key, emb)

        self.store.save_embeddings(text_embedding_pairs, model_name)

    def _put_ram(self, key: str, emb: np.ndarray) -> None:
        if len(self._ram_cache) >= self.max_ram_entries:
            # Evict first key
            first_key = next(iter(self._ram_cache))
            del self._ram_cache[first_key]
        self._ram_cache[key] = emb
