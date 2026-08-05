"""
Model_registry.py
Manages model versioning, metadata storage, and model registration.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
from engine_utils.config import MODEL_FILE_PATH, METADATA_FILE_PATH, TRAINED_MODELS_DIR
from engine_utils.logger import logger


class ModelRegistry:
    """Model metadata registry and versioning system."""

    def __init__(self, models_dir: Path = TRAINED_MODELS_DIR):
        self.models_dir = models_dir

    def register_model(
        self,
        model_instance: Any,
        classifier_type: str,
        embedding_model_name: str,
        metrics: Dict[str, Any],
        num_samples: int,
        version: str = "1.0.0"
    ) -> Path:
        """
        Saves model weights and serializes metadata JSON.
        """
        # Save model joblib file
        joblib.dump(model_instance, MODEL_FILE_PATH)
        logger.info(f"Saved trained classifier to {MODEL_FILE_PATH}")

        # Metadata dictionary
        metadata = {
            "version": version,
            "training_date": datetime.now().isoformat(),
            "dataset_version": "FinMate_Synthetic_v1",
            "embedding_model": embedding_model_name,
            "classifier": classifier_type,
            "accuracy": metrics.get("accuracy", 0.0),
            "top3_accuracy": metrics.get("top3_accuracy", 0.0),
            "f1_weighted": metrics.get("f1_weighted", 0.0),
            "number_of_samples": num_samples,
            "categories": metrics.get("classes", []),
            "per_category_accuracy": metrics.get("per_category_accuracy", {})
        }

        with open(METADATA_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Saved model metadata to {METADATA_FILE_PATH}")
        return MODEL_FILE_PATH

    @staticmethod
    def get_latest_metadata() -> Optional[Dict[str, Any]]:
        """Reads latest classifier_metadata.json safely if present."""
        if METADATA_FILE_PATH.exists() and METADATA_FILE_PATH.stat().st_size > 0:
            try:
                with open(METADATA_FILE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading metadata JSON: {e}")
        return None
