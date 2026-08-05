"""
Config.py
Configuration parameters for the NLP AI Transaction Categorization Engine.
"""

from pathlib import Path
from typing import List, Dict

# Paths
BASE_DIR: Path = Path(__file__).resolve().parent.parent
GENERATED_DATASET_DIR: Path = BASE_DIR.parent / "dataset_generator" / "generated"

DATASET_CSV_PATH: Path = GENERATED_DATASET_DIR / "synthetic_transactions.csv"
MERCHANT_METADATA_PATH: Path = GENERATED_DATASET_DIR / "merchant_metadata.csv"
MERCHANT_ALIASES_PATH: Path = GENERATED_DATASET_DIR / "merchant_aliases.csv"

TRAINED_MODELS_DIR: Path = BASE_DIR / "trained_models"
TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_LOGS_DIR: Path = BASE_DIR / "training_logs"
TRAINING_LOGS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_FILE_PATH: Path = TRAINED_MODELS_DIR / "merchant_classifier.joblib"
METADATA_FILE_PATH: Path = TRAINED_MODELS_DIR / "classifier_metadata.json"
CACHE_DB_PATH: Path = TRAINED_MODELS_DIR / "embedding_cache.db"

# Embedding Model Configuration
DEFAULT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION: int = 384

# Classifier Models
DEFAULT_CLASSIFIER: str = "LogisticRegression"  # Options: LogisticRegression, RandomForest, GradientBoosting, MLP
TEST_SIZE: float = 0.20
RANDOM_STATE: int = 42

# Confidence Thresholds
CONFIDENCE_THRESHOLDS: Dict[str, float] = {
    "LOW_MAX": 0.70,
    "MEDIUM_MAX": 0.90
}

# Strict Category List
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
