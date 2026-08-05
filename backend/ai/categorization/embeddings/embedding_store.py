"""
Embedding_store.py
Persistent SQLite storage for Transformer Embeddings to prevent redundant recomputations.
"""

import sqlite3
import hashlib
import pickle
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import numpy as np
from engine_utils.config import CACHE_DB_PATH
from engine_utils.logger import logger


class EmbeddingStore:
    """SQLite-backed persistent cache layer for embedding vectors."""

    def __init__(self, db_path: Path = CACHE_DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.db_path), timeout=10.0)

    def _init_db(self) -> None:
        """Creates embedding cache table and index if not already present."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS embedding_cache (
                    text_hash TEXT PRIMARY KEY,
                    raw_text TEXT,
                    model_name TEXT,
                    embedding BLOB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_model_text ON embedding_cache (model_name, text_hash);")
            conn.commit()

    @staticmethod
    def compute_hash(text: str) -> str:
        """Computes SHA-256 hash of cleaned text."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def get_embedding(self, text: str, model_name: str) -> Optional[np.ndarray]:
        """Retrieves cached embedding array for a single text if exists."""
        text_hash = self.compute_hash(text)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT embedding FROM embedding_cache WHERE text_hash = ? AND model_name = ?",
                (text_hash, model_name)
            )
            row = cursor.fetchone()
            if row:
                return pickle.loads(row[0])
        return None

    def get_batch_embeddings(self, texts: List[str], model_name: str) -> Tuple[Dict[str, np.ndarray], List[str]]:
        """
        Retrieves batch of cached embeddings. Returns (found_dict, missing_texts).
        found_dict maps text -> numpy vector.
        """
        hashes = [self.compute_hash(t) for t in texts]
        hash_to_text = {self.compute_hash(t): t for t in texts}

        found: Dict[str, np.ndarray] = {}
        missing: List[str] = []

        with self._get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ",".join(["?"] * len(hashes))
            query = f"SELECT text_hash, embedding FROM embedding_cache WHERE model_name = ? AND text_hash IN ({placeholders})"
            cursor.execute(query, [model_name] + hashes)

            rows = cursor.fetchall()
            found_hashes = set()

            for h, emb_blob in rows:
                raw_text = hash_to_text[h]
                found[raw_text] = pickle.loads(emb_blob)
                found_hashes.add(h)

            for h, text in hash_to_text.items():
                if h not in found_hashes:
                    missing.append(text)

        return found, missing

    def save_embeddings(self, text_embedding_pairs: List[Tuple[str, np.ndarray]], model_name: str) -> None:
        """Saves a batch of (text, numpy_embedding) pairs to the SQLite database."""
        if not text_embedding_pairs:
            return

        records = [
            (self.compute_hash(t), t, model_name, pickle.dumps(emb))
            for t, emb in text_embedding_pairs
        ]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT OR REPLACE INTO embedding_cache (text_hash, raw_text, model_name, embedding)
                VALUES (?, ?, ?, ?)
            """, records)
            conn.commit()
