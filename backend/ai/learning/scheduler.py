"""
Scheduler.py
Monitors transaction and feedback thresholds to trigger automatic model retraining.
"""

from typing import Dict, Any
from learning.learning_config import RETRAIN_FEEDBACK_THRESHOLD
from learning.feedback_service import feedback_service
from learning.retraining_service import retraining_service
from categorization.engine_utils.logger import logger


class RetrainingScheduler:
    """Monitors learning triggers and schedules automated model retraining."""

    @staticmethod
    def check_and_trigger() -> Dict[str, Any]:
        """Checks feedback and transaction counters against thresholds."""
        df_fb = feedback_service.get_feedback_dataframe()
        fb_count = len(df_fb)

        logger.info(f"Retraining Scheduler Check: {fb_count} / {RETRAIN_FEEDBACK_THRESHOLD} feedback entries collected.")

        if fb_count >= RETRAIN_FEEDBACK_THRESHOLD:
            logger.info("Feedback threshold reached! Triggering automatic model retraining pipeline...")
            return retraining_service.execute_retraining()

        return {
            "status": "THRESHOLD_NOT_MET",
            "feedbackCount": fb_count,
            "requiredFeedback": RETRAIN_FEEDBACK_THRESHOLD
        }


scheduler = RetrainingScheduler()
