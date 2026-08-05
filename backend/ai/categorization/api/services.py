"""
Services.py
Business logic service wrapper for AI Transaction Categorization.
"""

from typing import Dict, Any, List, Optional
from models.prediction import Predictor
from models.model_registry import ModelRegistry


class CategorizationService:
    """Service layer wrapping prediction and model metadata management."""

    def __init__(self):
        self.predictor = Predictor()

    def categorize_single(
        self,
        merchant: str,
        alias: Optional[str] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Classifies a single transaction."""
        return self.predictor.predict_single(merchant, alias, description, notes)

    def categorize_batch(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Classifies a batch of transactions."""
        return self.predictor.predict_batch(transactions)

    def get_active_model_info(self) -> Dict[str, Any]:
        """Returns active model metadata."""
        metadata = ModelRegistry.get_latest_metadata()
        if not metadata:
            return {"status": "NO_MODEL_LOADED"}
        return {"status": "ACTIVE", "metadata": metadata}
