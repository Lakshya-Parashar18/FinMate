"""
Feedback_manager.py
Central feedback and active learning manager for platform feedback collection.
"""

from typing import Dict, Any, Optional
from learning.feedback_service import feedback_service
from learning.active_learning import active_learning


class PlatformFeedbackManager:
    """Manages user corrections and unknown merchant feedback for platform retraining."""

    @staticmethod
    def record_user_correction(
        merchant: str,
        correct_category: str,
        description: Optional[str] = None,
        original_prediction: Optional[str] = None,
        confidence: Optional[float] = 0.0
    ) -> Dict[str, Any]:
        return feedback_service.record_feedback(
            merchant=merchant,
            correct_category=correct_category,
            description=description,
            original_prediction=original_prediction,
            confidence=confidence
        )

    @staticmethod
    def record_unknown(merchant: str, description: str, prediction: str, confidence: float):
        active_learning.record_unknown_merchant(merchant, description, prediction, confidence)


platform_feedback_manager = PlatformFeedbackManager()
