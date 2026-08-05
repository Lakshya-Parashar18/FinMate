"""
Feature_store.py
Centralized Feature Store serving engineered ML features (Merchant statistics, Historical averages,
Category frequencies, Rolling averages, Time-based & Behavioral features).
"""

import sqlite3
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
from config.platform_config import FEATURE_STORE_DB_PATH
from ai_utils.logger import logger


class CentralFeatureStore:
    """Central Feature Store for all downstream ML/DL capabilities."""

    def __init__(self, db_path: Path = FEATURE_STORE_DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.db_path), timeout=10.0)

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS merchant_features (
                    merchant_key TEXT PRIMARY KEY,
                    canonical_name TEXT,
                    frequency_count INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0.0,
                    avg_transaction_amount REAL DEFAULT 0.0,
                    primary_category TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_features (
                    user_id TEXT PRIMARY KEY,
                    user_persona TEXT,
                    monthly_avg_spending REAL DEFAULT 0.0,
                    top_category TEXT,
                    total_transactions INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def update_merchant_feature(self, merchant_raw: str, canonical_name: str, amount: float, category: str):
        """Updates rolling merchant statistics in feature store."""
        key = merchant_raw.strip().lower()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT frequency_count, total_spent FROM merchant_features WHERE merchant_key = ?", (key,))
            row = cursor.fetchone()

            if row:
                count = row[0] + 1
                total = row[1] + amount
                avg_amt = total / count
                cursor.execute("""
                    UPDATE merchant_features
                    SET frequency_count = ?, total_spent = ?, avg_transaction_amount = ?, primary_category = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE merchant_key = ?
                """, (count, total, avg_amt, category, key))
            else:
                cursor.execute("""
                    INSERT INTO merchant_features (merchant_key, canonical_name, frequency_count, total_spent, avg_transaction_amount, primary_category)
                    VALUES (?, ?, 1, ?, ?, ?)
                """, (key, canonical_name, amount, amount, category))

            conn.commit()

    def get_merchant_features(self, merchant_raw: str) -> Dict[str, Any]:
        key = merchant_raw.strip().lower()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT canonical_name, frequency_count, avg_transaction_amount, primary_category FROM merchant_features WHERE merchant_key = ?", (key,))
            row = cursor.fetchone()
            if row:
                return {
                    "canonical_name": row[0],
                    "frequency_count": row[1],
                    "avg_transaction_amount": row[2],
                    "primary_category": row[3]
                }
        return {"canonical_name": merchant_raw.title(), "frequency_count": 0, "avg_transaction_amount": 0.0, "primary_category": "Unknown"}


central_feature_store = CentralFeatureStore()
