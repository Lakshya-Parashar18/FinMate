"""
Learning_config.py
Configuration settings for the Continuous Learning & MLOps Platform for FinMate.
"""

from pathlib import Path
from typing import Dict, List

# Paths
LEARNING_DIR: Path = Path(__file__).resolve().parent
AI_DIR: Path = LEARNING_DIR.parent

CATEGORIZATION_DIR: Path = AI_DIR / "categorization"
TRAINED_MODELS_DIR: Path = CATEGORIZATION_DIR / "trained_models"

MODEL_FILE_PATH: Path = TRAINED_MODELS_DIR / "merchant_classifier.joblib"
METADATA_FILE_PATH: Path = TRAINED_MODELS_DIR / "classifier_metadata.json"
CACHE_DB_PATH: Path = TRAINED_MODELS_DIR / "embedding_cache.db"

LEARNING_DATA_DIR: Path = LEARNING_DIR / "data"
LEARNING_DATA_DIR.mkdir(parents=True, exist_ok=True)

FEEDBACK_CSV_PATH: Path = LEARNING_DATA_DIR / "feedback_dataset.csv"
UNKNOWN_MERCHANTS_CSV_PATH: Path = LEARNING_DATA_DIR / "unknown_merchants.csv"
LOW_CONFIDENCE_CSV_PATH: Path = LEARNING_DATA_DIR / "low_confidence_dataset.csv"
MERGED_TRAINING_CSV_PATH: Path = LEARNING_DATA_DIR / "merged_training_dataset.csv"

VERSIONS_DIR: Path = LEARNING_DIR / "versions"
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)

ANALYTICS_REPORTS_DIR: Path = LEARNING_DIR / "reports"
ANALYTICS_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Thresholds for Active Learning & Automatic Retraining
LOW_CONFIDENCE_THRESHOLD: float = 0.70
RETRAIN_FEEDBACK_THRESHOLD: int = 1000
RETRAIN_TRANSACTIONS_THRESHOLD: int = 5000
DRIFT_KL_THRESHOLD: float = 0.25

# Categories
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
