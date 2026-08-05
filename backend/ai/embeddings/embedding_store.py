"""
Embedding_store.py
Persistent vector store for caching Transformer embeddings independently of classifiers.
"""

import sqlite3
import hashlib
import pickle
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import numpy as np
from config.platform_config import CACHE_DB_PATH
from ai_utils.logger import logger


class EmbeddingStore:
    """SQLite vector store layer tracking model version, text hash, and dense vectors."""

    def __init__(self, db_path: Path = CACHE_DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.db_path), timeout=10.0)

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS platform_embeddings (
                    text_hash TEXT PRIMARY KEY,
                    raw_text TEXT,
                    model_name TEXT,
                    embedding BLOB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_model_hash ON platform_embeddings (model_name, text_hash);")
            conn.commit()

    @staticmethod
    def compute_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def get_vector(self, text: str, model_name: str) -> Optional[np.ndarray]:
        text_hash = self.compute_hash(text)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT embedding FROM platform_embeddings WHERE text_hash = ? AND model_name = ?",
                (text_hash, model_name)
            )
            row = cursor.fetchone()
            if row:
                return pickle.loads(row[0])
        return None

    def save_vector(self, text: str, embedding: np.ndarray, model_name: str) -> None:
        text_hash = self.compute_hash(text)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO platform_embeddings (text_hash, raw_text, model_name, embedding)
                VALUES (?, ?, ?, ?)
            """, (text_hash, text, model_name, pickle.dumps(embedding)))
            conn.commit()


embedding_store = EmbeddingStore()
