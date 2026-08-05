"""
Notifications.py
Backend event notifier for deployment, rollback, retraining, and drift alerts.
"""

from typing import Dict, Any
from categorization.engine_utils.logger import logger


class MLOpsNotificationService:
    """Dispatches MLOps pipeline alerts and events."""

    @staticmethod
    def notify_event(event_type: str, details: Dict[str, Any]):
        logger.info(f"MLOps EVENT [{event_type}]: {details}")


notifications = MLOpsNotificationService()
