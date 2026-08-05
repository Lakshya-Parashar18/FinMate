"""
Versioning.py
Semantic version manager and model artifact packager for AI model releases.
"""

import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from learning.learning_config import VERSIONS_DIR, MODEL_FILE_PATH, METADATA_FILE_PATH
from categorization.engine_utils.logger import logger


class ModelVersionManager:
    """Manages version string increments and archives model artifacts in versions/."""

    def __init__(self, versions_dir: Path = VERSIONS_DIR):
        self.versions_dir = versions_dir
        self.versions_dir.mkdir(parents=True, exist_ok=True)

    def get_next_version(self, current_version: str = "1.0.0", is_major: bool = False) -> str:
        """Increments semantic version string (e.g. 1.0.0 -> 1.1.0)."""
        try:
            parts = [int(p) for p in current_version.replace("v", "").split(".")]
            if is_major:
                return f"v{parts[0] + 1}.0.0"
            else:
                return f"v{parts[0]}.{parts[1] + 1}.0"
        except Exception:
            return f"v1.1.0"

    def archive_version(self, version_tag: str, metadata: Dict[str, Any]) -> Path:
        """Archives current joblib model and metadata JSON into versions/<version_tag>/."""
        v_dir = self.versions_dir / version_tag
        v_dir.mkdir(parents=True, exist_ok=True)

        if MODEL_FILE_PATH.exists():
            shutil.copy2(MODEL_FILE_PATH, v_dir / "merchant_classifier.joblib")
        if METADATA_FILE_PATH.exists():
            shutil.copy2(METADATA_FILE_PATH, v_dir / "classifier_metadata.json")

        logger.info(f"Archived model artifacts for version '{version_tag}' to {v_dir}")
        return v_dir


version_manager = ModelVersionManager()
