"""
Model_loader.py
Singleton model loader for loading trained Financial Health Regression models.
"""

import json
from pathlib import Path
from typing import Tuple, Any, Dict, Optional
import joblib
from financial_health.config import HEALTH_MODEL_PATH, HEALTH_METADATA_PATH
from ai_utils.logger import logger


class HealthModelLoader:
    """Singleton model loader for Financial Health ML models."""

    _instance = None
    _model: Optional[Any] = None
    _metadata: Optional[Dict[str, Any]] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HealthModelLoader, cls).__new__(cls)
        return cls._instance

    def load_model(self, force_reload: bool = False) -> Tuple[Optional[Any], Dict[str, Any]]:
        if not force_reload and self._model is not None and self._metadata is not None:
            return self._model, self._metadata

        if HEALTH_MODEL_PATH.exists():
            logger.info(f"Loading Financial Health Model from {HEALTH_MODEL_PATH}...")
            self._model = joblib.load(HEALTH_MODEL_PATH)
        else:
            logger.warning(f"Financial Health model not found at {HEALTH_MODEL_PATH}. Using rule-based fallback.")
            self._model = None

        if HEALTH_METADATA_PATH.exists():
            with open(HEALTH_METADATA_PATH, "r", encoding="utf-8") as f:
                self._metadata = json.load(f)
        else:
            self._metadata = {"version": "1.0.0", "model_type": "Fallback"}

        return self._model, self._metadata


health_model_loader = HealthModelLoader()
