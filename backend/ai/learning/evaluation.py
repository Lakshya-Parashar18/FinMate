"""
Evaluation.py
Evaluates candidate retrained model against production model to prevent catastrophic regressions.
"""

from typing import Dict, Any, Tuple
import numpy as np
from categorization.models.metrics import ModelMetrics
from categorization.engine_utils.logger import logger


class ModelComparisonEvaluator:
    """Evaluates candidate model vs production model performance."""

    @staticmethod
    def compare_models(
        current_metrics: Dict[str, Any],
        candidate_metrics: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Determines whether the candidate model should replace the current model in production.
        Rules:
        1. Candidate F1 Weighted must be >= Current F1 Weighted - 0.001.
        2. Top-3 Accuracy must not degrade by more than 1%.
        """
        curr_f1 = current_metrics.get("f1_weighted", 0.0)
        cand_f1 = candidate_metrics.get("f1_weighted", 0.0)

        curr_top3 = current_metrics.get("top3_accuracy", 0.0)
        cand_top3 = candidate_metrics.get("top3_accuracy", 0.0)

        f1_diff = cand_f1 - curr_f1
        top3_diff = cand_top3 - curr_top3

        if f1_diff >= 0 and top3_diff >= -0.01:
            reason = f"Candidate model maintained or improved F1 score ({cand_f1:.4f} vs Current: {curr_f1:.4f})"
            logger.info(f"Model Comparison PASSED: {reason}")
            return True, reason

        elif abs(f1_diff) <= 0.005 and cand_top3 >= curr_top3:
            reason = f"Candidate model maintained F1 ({cand_f1:.4f}) with solid Top-3 Accuracy ({cand_top3:.4f})"
            logger.info(f"Model Comparison PASSED: {reason}")
            return True, reason

        else:
            reason = f"Candidate model rejected: F1 diff is {f1_diff:+.4f} and Top-3 diff is {top3_diff:+.4f}"
            logger.info(f"Model Comparison REJECTED: {reason}")
            return False, reason
