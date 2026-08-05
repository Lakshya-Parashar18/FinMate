"""
Cache_service.py
SQLite and RAM embedding caching service to prevent duplicate vector computation.
"""

import sqlite3
import hashlib
import pickle
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import numpy as np
from config import CACHE_DB_PATH, CACHE_MAX_RAM_ENTRIES
from logging_service import logger
from metrics import metrics_tracker


class CacheService:
    """Production RAM LRU + SQLite embedding cache layer."""

    def __init__(self, db_path: Path = CACHE_DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ram_cache: Dict[str, np.ndarray] = {}
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.db_path), timeout=10.0)

    def _init_db(self) -> None:
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
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def get_embedding(self, text: str, model_name: str) -> Optional[np.ndarray]:
        key = f"{model_name}:{text}"
        if key in self._ram_cache:
            metrics_tracker.record_cache_hit()
            return self._ram_cache[key]

        text_hash = self.compute_hash(text)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT embedding FROM embedding_cache WHERE text_hash = ? AND model_name = ?",
                (text_hash, model_name)
            )
            row = cursor.fetchone()
            if row:
                emb = pickle.loads(row[0])
                self._put_ram(key, emb)
                metrics_tracker.record_cache_hit()
                return emb

        metrics_tracker.record_cache_miss()
        return None

    def save_embedding(self, text: str, embedding: np.ndarray, model_name: str) -> None:
        key = f"{model_name}:{text}"
        self._put_ram(key, embedding)

        text_hash = self.compute_hash(text)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO embedding_cache (text_hash, raw_text, model_name, embedding)
                VALUES (?, ?, ?, ?)
            """, (text_hash, text, model_name, pickle.dumps(embedding)))
            conn.commit()

    def _put_ram(self, key: str, emb: np.ndarray) -> None:
        if len(self._ram_cache) >= CACHE_MAX_RAM_ENTRIES:
            first_key = next(iter(self._ram_cache))
            del self._ram_cache[first_key]
        self._ram_cache[key] = emb


cache_service = CacheService()
