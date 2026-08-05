"""
Model_loader.py
Loads trained model weights and metadata into memory safely with singleton caching.
"""

from pathlib import Path
from typing import Tuple, Any, Dict, Optional
import joblib
from engine_utils.config import MODEL_FILE_PATH, METADATA_FILE_PATH
from models.model_registry import ModelRegistry
from engine_utils.logger import logger


class ModelLoader:
    """Loads and caches trained model artifact instances."""

    _cached_model: Optional[Any] = None
    _cached_metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def load_model(cls, model_path: Path = MODEL_FILE_PATH, force_reload: bool = False) -> Tuple[Any, Dict[str, Any]]:
        """
        Loads classifier model and metadata. Uses singleton caching for fast inference.
        """
        if not force_reload and cls._cached_model is not None and cls._cached_metadata is not None:
            return cls._cached_model, cls._cached_metadata

        if not model_path.exists():
            logger.error(f"Trained model file not found at {model_path}")
            raise FileNotFoundError(f"Model file not found at {model_path}. Please run train.py first.")

        metadata = ModelRegistry.get_latest_metadata()
        if not metadata:
            raise FileNotFoundError(f"Metadata file not found at {METADATA_FILE_PATH}.")

        logger.info(f"Loading classifier model from {model_path}...")
        model = joblib.load(model_path)

        cls._cached_model = model
        cls._cached_metadata = metadata

        return model, metadata
