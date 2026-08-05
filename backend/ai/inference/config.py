"""
Config.py
Configuration parameters for the AI Transaction Categorization Inference System.
"""

from pathlib import Path
from typing import Dict, List

# Paths
INFERENCE_DIR: Path = Path(__file__).resolve().parent
AI_DIR: Path = INFERENCE_DIR.parent

CATEGORIZATION_DIR: Path = AI_DIR / "categorization"
TRAINED_MODELS_DIR: Path = CATEGORIZATION_DIR / "trained_models"

MODEL_FILE_PATH: Path = TRAINED_MODELS_DIR / "merchant_classifier.joblib"
METADATA_FILE_PATH: Path = TRAINED_MODELS_DIR / "classifier_metadata.json"
CACHE_DB_PATH: Path = TRAINED_MODELS_DIR / "embedding_cache.db"

DATASET_GENERATED_DIR: Path = AI_DIR / "dataset_generator" / "generated"
MERCHANT_METADATA_PATH: Path = DATASET_GENERATED_DIR / "merchant_metadata.csv"

# Model Defaults
DEFAULT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION: int = 384

# Confidence Thresholds
CONFIDENCE_THRESHOLDS: Dict[str, float] = {
    "HIGH": 0.90,
    "MEDIUM": 0.70,
    "LOW": 0.00
}

# Supported Categories
SUPPORTED_CATEGORIES: List[str] = [
    "Food & Dining",
    "Groceries",
    "Transportation",
    "Rent & Housing",
    "Entertainment",
    "Healthcare",
    "Education",
    "Shopping",
    "Utilities",
    "Investments",
    "Vacation",
    "Grooming",
    "Miscellaneous"
]

# Performance & Cache
CACHE_MAX_RAM_ENTRIES: int = 10000
DEFAULT_BATCH_SIZE: int = 256
MAX_LATENCY_TARGET_MS: float = 100.0
