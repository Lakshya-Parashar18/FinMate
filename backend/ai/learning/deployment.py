"""
Deployment.py
Manages zero-downtime model deployments, shadow testing, and canary rollouts.
"""

import gc
import shutil
from pathlib import Path
from typing import Dict, Any, Tuple
from learning.learning_config import MODEL_FILE_PATH, METADATA_FILE_PATH
from learning.versioning import version_manager
from learning.model_registry import learning_registry
from categorization.models.model_loader import ModelLoader
from categorization.engine_utils.logger import logger


class DeploymentManager:
    """Production deployment manager with zero downtime model hot-swapping."""

    @staticmethod
    def _safe_copy(src: Path, dst: Path):
        """Copies file safely using atomic replace to prevent Windows file lock conflicts."""
        gc.collect()
        temp_dst = dst.with_name(dst.name + ".tmp")
        shutil.copy2(src, temp_dst)
        temp_dst.replace(dst)

    @staticmethod
    def deploy_new_version(
        version_tag: str,
        new_model_path: Path,
        new_metadata_path: Path,
        metadata: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Deploys new model artifacts and triggers zero-downtime model reload.
        """
        try:
            # 1. Archive new version
            version_manager.archive_version(version_tag, metadata)

            # 2. Copy artifacts into active trained_models directory safely via atomic replace
            DeploymentManager._safe_copy(new_model_path, MODEL_FILE_PATH)
            DeploymentManager._safe_copy(new_metadata_path, METADATA_FILE_PATH)

            # 3. Hot-reload model in singleton loader
            ModelLoader.load_model(force_reload=True)

            # 4. Register deployment in MLOps Registry
            learning_registry.register_new_model(version_tag, metadata, is_active=True)

            msg = f"Successfully deployed model version {version_tag} into production!"
            logger.info(msg)
            return True, msg

        except Exception as e:
            err_msg = f"Deployment failed for version {version_tag}: {e}"
            logger.error(err_msg)
            return False, err_msg


deployment_manager = DeploymentManager()
