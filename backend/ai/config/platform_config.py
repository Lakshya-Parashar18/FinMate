"""
Platform_config.py
Centralized configuration system for the FinMate AI Platform.
"""

from pathlib import Path
from typing import Dict, List, Any

# Root Paths
AI_ROOT_DIR: Path = Path(__file__).resolve().parent.parent
BACKEND_DIR: Path = AI_ROOT_DIR.parent

# Storage Directories
STORAGE_DIR: Path = AI_ROOT_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MODELS_DIR: Path = STORAGE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DATASETS_DIR: Path = STORAGE_DIR / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

VERSIONS_DIR: Path = STORAGE_DIR / "versions"
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)

REPORTS_DIR: Path = STORAGE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Central Databases
CACHE_DB_PATH: Path = STORAGE_DIR / "embedding_store.db"
FEATURE_STORE_DB_PATH: Path = STORAGE_DIR / "feature_store.db"
REGISTRY_JSON_PATH: Path = STORAGE_DIR / "model_registry.json"

# Dataset Generator Paths
DATASET_GEN_DIR: Path = AI_ROOT_DIR / "dataset_generator" / "generated"
SYNTHETIC_CSV_PATH: Path = DATASET_GEN_DIR / "synthetic_transactions.csv"
MERCHANT_METADATA_PATH: Path = DATASET_GEN_DIR / "merchant_metadata.csv"

# Model Defaults
DEFAULT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION: int = 384
ENABLE_ONNX_INFERENCE: bool = False  # Toggle between Native joblib and ONNX backend

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

# Performance Limits
MAX_RAM_CACHE_ENTRIES: int = 10000
DEFAULT_BATCH_SIZE: int = 256
MAX_LATENCY_TARGET_MS: float = 100.0
DRIFT_KL_THRESHOLD: float = 0.25
RETRAIN_FEEDBACK_THRESHOLD: int = 1000
