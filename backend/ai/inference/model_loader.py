"""
Model_loader.py
Singleton model loader that loads SentenceTransformer and trained classifier artifacts ONCE at startup.
"""

import json
from pathlib import Path
from typing import Tuple, Any, Dict, Optional
import joblib
from sentence_transformers import SentenceTransformer
from config import MODEL_FILE_PATH, METADATA_FILE_PATH, DEFAULT_EMBEDDING_MODEL
from logging_service import logger


class SingletonModelLoader:
    """Thread-safe singleton model loader for high-performance AI inference."""

    _instance = None
    _classifier_model: Optional[Any] = None
    _metadata: Optional[Dict[str, Any]] = None
    _transformer_model: Optional[SentenceTransformer] = None
    _is_initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SingletonModelLoader, cls).__new__(cls)
        return cls._instance

    def initialize(self, force_reload: bool = False) -> bool:
        """Loads transformer and classifier artifacts into RAM once."""
        if self._is_initialized and not force_reload:
            return True

        try:
            logger.info("Initializing AI Inference Model Loader...")

            # 1. Load Metadata
            if METADATA_FILE_PATH.exists():
                with open(METADATA_FILE_PATH, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
                logger.info(f"Loaded classifier metadata (Version: {self._metadata.get('version')}, Classifier: {self._metadata.get('classifier')})")
            else:
                logger.warning(f"Metadata file not found at {METADATA_FILE_PATH}. Using default metadata.")
                self._metadata = {"version": "1.0.0", "embedding_model": DEFAULT_EMBEDDING_MODEL, "classifier": "Default"}

            # 2. Load Transformer Embedding Model
            emb_model_name = self._metadata.get("embedding_model", DEFAULT_EMBEDDING_MODEL)
            logger.info(f"Loading SentenceTransformer model: {emb_model_name}...")
            self._transformer_model = SentenceTransformer(emb_model_name)

            # 3. Load Classifier Joblib Model
            if MODEL_FILE_PATH.exists():
                logger.info(f"Loading trained classifier joblib from {MODEL_FILE_PATH}...")
                self._classifier_model = joblib.load(MODEL_FILE_PATH)
            else:
                logger.warning(f"Trained classifier not found at {MODEL_FILE_PATH}. AI Engine will run in fallback mode.")
                self._classifier_model = None

            self._is_initialized = True
            logger.info("AI Model Loader initialized successfully!")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize AI Model Loader: {e}")
            self._is_initialized = False
            return False

    @property
    def classifier(self) -> Optional[Any]:
        if not self._is_initialized:
            self.initialize()
        return self._classifier_model

    @property
    def transformer(self) -> Optional[SentenceTransformer]:
        if not self._is_initialized:
            self.initialize()
        return self._transformer_model

    @property
    def metadata(self) -> Dict[str, Any]:
        if not self._is_initialized:
            self.initialize()
        return self._metadata or {}

    @property
    def is_model_loaded(self) -> bool:
        return self._is_initialized and self._classifier_model is not None


model_loader = SingletonModelLoader()
