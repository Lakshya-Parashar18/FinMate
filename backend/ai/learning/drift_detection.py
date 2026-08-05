"""
Drift_detection.py
Monitors data drift in merchant, category, and confidence distributions using KL-Divergence and PSI.
"""

from typing import Dict, Any, List
import numpy as np
from learning.learning_config import DRIFT_KL_THRESHOLD, SUPPORTED_CATEGORIES
from categorization.engine_utils.logger import logger


class DataDriftDetector:
    """Monitors incoming transaction distribution shifts against training baseline."""

    @staticmethod
    def calculate_kl_divergence(p: np.ndarray, q: np.ndarray) -> float:
        """Calculates Kullback-Leibler Divergence between baseline P and current Q."""
        p = np.asarray(p, dtype=float) + 1e-6
        q = np.asarray(q, dtype=float) + 1e-6

        p /= np.sum(p)
        q /= np.sum(q)

        return float(np.sum(p * np.log(p / q)))

    def detect_category_drift(
        self,
        baseline_distribution: Dict[str, float],
        recent_distribution: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculates category drift and returns drift status & recommendations.
        """
        p_vec = np.array([baseline_distribution.get(cat, 0.01) for cat in SUPPORTED_CATEGORIES])
        q_vec = np.array([recent_distribution.get(cat, 0.01) for cat in SUPPORTED_CATEGORIES])

        kl_score = round(self.calculate_kl_divergence(p_vec, q_vec), 4)
        is_drift_detected = kl_score > DRIFT_KL_THRESHOLD

        return {
            "klDivergence": kl_score,
            "threshold": DRIFT_KL_THRESHOLD,
            "driftDetected": is_drift_detected,
            "recommendation": "TRIGGER_RETRAINING" if is_drift_detected else "NO_ACTION_REQUIRED"
        }


drift_detector = DataDriftDetector()
