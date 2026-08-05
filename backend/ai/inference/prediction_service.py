"""
Prediction_service.py
High-level prediction service with non-crashing failsafe fallback logic.
Hierarchy: AI Prediction -> Previous User Mapping -> Merchant Metadata -> Miscellaneous.
"""

from typing import Dict, Any, Optional
import pandas as pd
from categorization_service import categorization_service
from merchant_service import MerchantService
from config import MERCHANT_METADATA_PATH, SUPPORTED_CATEGORIES
from metrics import metrics_tracker
from logging_service import logger


class PredictionFailsafeService:
    """Failsafe prediction manager ensuring 100% backend availability."""

    def __init__(self):
        self.categorization_service = categorization_service
        self._merchant_catalog: Dict[str, str] = {}
        self._load_merchant_metadata()

    def _load_merchant_metadata(self):
        """Loads fallback merchant metadata catalog if available."""
        if MERCHANT_METADATA_PATH.exists():
            try:
                df = pd.read_csv(MERCHANT_METADATA_PATH)
                for _, row in df.iterrows():
                    m_name = str(row.get("official_name", "")).strip().lower()
                    cat = str(row.get("category", "")).strip()
                    if m_name and cat in SUPPORTED_CATEGORIES:
                        self._merchant_catalog[m_name] = cat
                logger.info(f"Loaded {len(self._merchant_catalog)} fallback merchant catalog entries.")
            except Exception as e:
                logger.warning(f"Could not load fallback merchant metadata: {e}")

    def process_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes transaction creation/edit with automatic categorization and failsafe fallbacks.
        """
        merchant_raw = transaction_data.get("merchant", "")
        alias_raw = transaction_data.get("merchant_alias", "")
        description = transaction_data.get("description", "")
        notes = transaction_data.get("notes", "")
        manual_category = transaction_data.get("category")

        # 1. Respect Manual User Selection
        if manual_category and manual_category in SUPPORTED_CATEGORIES:
            logger.debug(f"User manually selected category '{manual_category}'. Respecting user choice.")
            transaction_data["category"] = manual_category
            transaction_data["isUserOverridden"] = True
            return transaction_data

        # 2. Attempt AI Categorization
        try:
            ai_result = self.categorization_service.predict_transaction(
                merchant_raw=merchant_raw,
                alias_raw=alias_raw,
                description_raw=description,
                notes_raw=notes
            )

            transaction_data["category"] = ai_result["predictedCategory"]
            transaction_data["confidence"] = ai_result["confidence"]
            transaction_data["confidenceLevel"] = ai_result["confidenceLevel"]
            transaction_data["topPredictions"] = ai_result["topPredictions"]
            transaction_data["aiMetadata"] = ai_result["aiMetadata"]
            return transaction_data

        except Exception as e:
            logger.error(f"AI Prediction exception encountered: {e}. Triggering failsafe fallback sequence.")
            metrics_tracker.record_fallback()

        # 3. Fallback: Merchant Metadata Catalog Lookup
        normalized_merchant, _ = MerchantService.normalize_merchant(merchant_raw)
        catalog_match = self._merchant_catalog.get(normalized_merchant.lower())

        if catalog_match:
            logger.info(f"Fallback matched '{normalized_merchant}' in Merchant Catalog -> '{catalog_match}'")
            transaction_data["category"] = catalog_match
            transaction_data["confidence"] = 0.80
            transaction_data["confidenceLevel"] = "MEDIUM"
            return transaction_data

        # 4. Final Fallback: Miscellaneous
        logger.info(f"Applying final fallback 'Miscellaneous' for merchant '{merchant_raw}'")
        transaction_data["category"] = "Miscellaneous"
        transaction_data["confidence"] = 0.50
        transaction_data["confidenceLevel"] = "LOW"

        return transaction_data


prediction_service = PredictionFailsafeService()
