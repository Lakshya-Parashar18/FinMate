"""
Rollback.py
Instant 1-click model rollback service restoring any previous model version from versions/.
"""

import shutil
from pathlib import Path
from typing import Tuple, Dict, Any
from learning.learning_config import VERSIONS_DIR, MODEL_FILE_PATH, METADATA_FILE_PATH
from learning.model_registry import learning_registry
from categorization.models.model_loader import ModelLoader
from categorization.engine_utils.logger import logger


class RollbackManager:
    """Manages instant rollback to historical model versions."""

    def rollback_to_version(self, target_version: str, reason: str = "Manual Rollback") -> Tuple[bool, str]:
        """
        Restores joblib model and metadata from versions/<target_version>/ back into trained_models/.
        """
        v_dir = VERSIONS_DIR / target_version

        if not v_dir.exists():
            msg = f"Rollback failed: Version '{target_version}' does not exist in {VERSIONS_DIR}."
            logger.error(msg)
            return False, msg

        v_model = v_dir / "merchant_classifier.joblib"
        v_meta = v_dir / "classifier_metadata.json"

        if not v_model.exists() or not v_meta.exists():
            msg = f"Rollback failed: Artifacts missing in version directory '{v_dir}'."
            logger.error(msg)
            return False, msg

        try:
            # 1. Restore artifacts
            shutil.copy2(v_model, MODEL_FILE_PATH)
            shutil.copy2(v_meta, METADATA_FILE_PATH)

            # 2. Hot-reload model in singleton loader
            ModelLoader.load_model(force_reload=True)

            # 3. Record in MLOps Registry
            learning_registry.record_rollback(target_version, reason)

            msg = f"Successfully rolled back production model to '{target_version}'! Reason: {reason}"
            logger.info(msg)
            return True, msg

        except Exception as e:
            msg = f"Rollback execution error: {e}"
            logger.error(msg)
            return False, msg


rollback_manager = RollbackManager()
