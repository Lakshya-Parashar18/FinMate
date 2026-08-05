"""
Middleware.py
Failsafe transaction request interceptor that silently injects AI categorization before saving.
"""

from typing import Dict, Any, Callable
from prediction_service import prediction_service
from logging_service import logger


class AICategorizationMiddleware:
    """Failsafe backend middleware for automatic transaction categorization."""

    @staticmethod
    def process_request(transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intercepts transaction payload and enriches it with AI prediction if category is missing or default.
        """
        try:
            return prediction_service.process_transaction(transaction_data)
        except Exception as e:
            logger.error(f"Middleware exception: {e}. Falling back to original payload.")
            if "category" not in transaction_data:
                transaction_data["category"] = "Miscellaneous"
            return transaction_data
