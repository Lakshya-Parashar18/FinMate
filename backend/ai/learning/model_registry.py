"""
Model_registry.py
Central model registry tracking version history, deployments, metrics, and dataset tags.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from learning_config import LEARNING_DIR, METADATA_FILE_PATH
from categorization.engine_utils.logger import logger


class LearningModelRegistry:
    """Persistent MLOps model registry tracking deployment & version history."""

    def __init__(self, registry_file: Path = LEARNING_DIR / "model_registry.json"):
        self.registry_file = registry_file
        self._init_registry()

    def _init_registry(self):
        if not self.registry_file.exists():
            data = {
                "active_version": "v1.0.0",
                "deployments": [],
                "rollbacks": [],
                "history": []
            }
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def _load_registry(self) -> Dict[str, Any]:
        with open(self.registry_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_registry(self, data: Dict[str, Any]) -> None:
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def register_new_model(self, version: str, metadata: Dict[str, Any], is_active: bool = False) -> None:
        """Registers a newly trained model build in history."""
        data = self._load_registry()
        entry = {
            "version": version,
            "registered_at": datetime.now().isoformat(),
            "classifier": metadata.get("classifier", "Unknown"),
            "embedding_model": metadata.get("embedding_model", "Unknown"),
            "accuracy": metadata.get("accuracy", 0.0),
            "top3_accuracy": metadata.get("top3_accuracy", 0.0),
            "f1_weighted": metadata.get("f1_weighted", 0.0),
            "number_of_samples": metadata.get("number_of_samples", 0),
            "status": "ACTIVE" if is_active else "STAGED"
        }
        data["history"].append(entry)
        if is_active:
            data["active_version"] = version
            data["deployments"].append({
                "version": version,
                "deployed_at": datetime.now().isoformat(),
                "reason": "Automatic Retraining Deployment"
            })
        self._save_registry(data)
        logger.info(f"Registered model version '{version}' in MLOps Registry.")

    def record_rollback(self, restored_version: str, reason: str) -> None:
        """Records a rollback event in registry."""
        data = self._load_registry()
        data["active_version"] = restored_version
        data["rollbacks"].append({
            "restored_version": restored_version,
            "rollback_at": datetime.now().isoformat(),
            "reason": reason
        })
        self._save_registry(data)
        logger.info(f"Recorded model rollback to version '{restored_version}'.")

    def get_active_version(self) -> str:
        data = self._load_registry()
        return data.get("active_version", "v1.0.0")

    def get_full_history(self) -> Dict[str, Any]:
        return self._load_registry()


learning_registry = LearningModelRegistry()
