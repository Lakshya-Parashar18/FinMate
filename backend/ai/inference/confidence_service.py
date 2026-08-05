"""
Confidence_service.py
Calculates numerical confidence probabilities, calibrates confidence levels (HIGH, MEDIUM, LOW),
and formats top-3 predictions.
"""

from typing import Dict, Any, List
import numpy as np
from config import CONFIDENCE_THRESHOLDS


class ConfidenceService:
    """Service for calibrating prediction confidence and probability distributions."""

    @staticmethod
    def calibrate_level(confidence: float) -> str:
        """
        Maps probability score to confidence category:
        - HIGH (> 90%)
        - MEDIUM (70% - 90%)
        - LOW (< 70%)
        """
        if confidence >= CONFIDENCE_THRESHOLDS["HIGH"]:
            return "HIGH"
        elif confidence >= CONFIDENCE_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def format_top_predictions(classes: List[str], probabilities: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        """Extracts top-k predictions with confidence rounded to 4 decimals."""
        top_indices = np.argsort(probabilities)[::-1][:top_k]
        return [
            {
                "category": str(classes[idx]),
                "confidence": round(float(probabilities[idx]), 4)
            }
            for idx in top_indices
        ]
