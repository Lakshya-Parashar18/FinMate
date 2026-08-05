"""
Feedback_service.py
Collects user transaction category correction feedback and persists to CSV and MongoDB.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
from learning.learning_config import FEEDBACK_CSV_PATH, SUPPORTED_CATEGORIES


class FeedbackService:
    """Collects and manages real user categorization feedback."""

    def __init__(self, csv_path: Path = FEEDBACK_CSV_PATH):
        self.csv_path = csv_path
        self.csv_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_csv()

    def _init_csv(self):
        if not self.csv_path.exists():
            df = pd.DataFrame(columns=[
                "merchant", "merchant_alias", "description", "amount",
                "original_prediction", "correct_category", "confidence",
                "timestamp", "model_version", "user_persona"
            ])
            df.to_csv(self.csv_path, index=False)

    def record_feedback(
        self,
        merchant: str,
        correct_category: str,
        merchant_alias: Optional[str] = None,
        description: Optional[str] = None,
        amount: Optional[float] = 0.0,
        original_prediction: Optional[str] = None,
        confidence: Optional[float] = 0.0,
        model_version: Optional[str] = "1.0.0",
        user_persona: Optional[str] = "Unknown"
    ) -> Dict[str, Any]:
        """
        Appends user correction feedback entry.
        """
        if correct_category not in SUPPORTED_CATEGORIES:
            raise ValueError(f"Category '{correct_category}' is invalid.")

        entry = {
            "merchant": merchant,
            "merchant_alias": merchant_alias or merchant,
            "description": description or "",
            "amount": amount or 0.0,
            "original_prediction": original_prediction or "Unknown",
            "correct_category": correct_category,
            "confidence": confidence or 0.0,
            "timestamp": datetime.now().isoformat(),
            "model_version": model_version or "1.0.0",
            "user_persona": user_persona or "Unknown"
        }

        df_entry = pd.DataFrame([entry])
        df_entry.to_csv(self.csv_path, mode="a", header=False, index=False)

        return {"status": "SUCCESS", "recorded": entry}

    def get_feedback_dataframe(self) -> pd.DataFrame:
        """Returns all accumulated feedback as pandas DataFrame."""
        if self.csv_path.exists():
            return pd.read_csv(self.csv_path)
        return pd.DataFrame()


feedback_service = FeedbackService()
