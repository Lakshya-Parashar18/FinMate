"""
Model_registry.py
Central MLOps Model Registry tracking model versions, data lineage, framework metrics, and deployment status.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from config.platform_config import REGISTRY_JSON_PATH
from ai_utils.logger import logger


class PlatformModelRegistry:
    """Central MLOps Model Registry tracking all models, deployments, and lineage."""

    def __init__(self, registry_file: Path = REGISTRY_JSON_PATH):
        self.registry_file = registry_file
        self.registry_file.parent.mkdir(parents=True, exist_ok=True)
        self._init_registry()

    def _init_registry(self):
        if not self.registry_file.exists():
            initial_model = {
                "model_id": "merchant_classifier_v1.0.0",
                "version": "1.0.0",
                "training_date": datetime.now().isoformat(),
                "dataset_version": "dataset_v1",
                "embedding_version": "sentence-transformers/all-MiniLM-L6-v2",
                "framework": "scikit-learn/MLP",
                "accuracy": 1.0,
                "top3_accuracy": 1.0,
                "f1_weighted": 1.0,
                "latency_target_ms": 5.0,
                "model_path": "storage/models/merchant_classifier.joblib",
                "deployment_status": "ACTIVE"
            }
            data = {
                "active_model_id": "merchant_classifier_v1.0.0",
                "models": [initial_model]
            }
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def _load(self) -> Dict[str, Any]:
        with open(self.registry_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data: Dict[str, Any]):
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def register_model(
        self,
        model_id: str,
        version: str,
        dataset_version: str,
        embedding_version: str,
        framework: str,
        metrics: Dict[str, Any],
        model_path: str,
        is_active: bool = False
    ) -> Dict[str, Any]:
        data = self._load()
        entry = {
            "model_id": model_id,
            "version": version,
            "training_date": datetime.now().isoformat(),
            "dataset_version": dataset_version,
            "embedding_version": embedding_version,
            "framework": framework,
            "accuracy": metrics.get("accuracy", 0.0),
            "top3_accuracy": metrics.get("top3_accuracy", 0.0),
            "f1_weighted": metrics.get("f1_weighted", 0.0),
            "latency_target_ms": 5.0,
            "model_path": model_path,
            "deployment_status": "ACTIVE" if is_active else "STAGED"
        }
        data["models"].append(entry)
        if is_active:
            data["active_model_id"] = model_id

        self._save(data)
        logger.info(f"Registered model '{model_id}' (Version: {version}) in Platform Model Registry.")
        return entry

    def get_active_model_metadata(self) -> Optional[Dict[str, Any]]:
        data = self._load()
        active_id = data.get("active_model_id")
        for m in data.get("models", []):
            if m.get("model_id") == active_id or m.get("version") == active_id:
                return m
        return data["models"][-1] if data.get("models") else None

    def get_all_models(self) -> List[Dict[str, Any]]:
        return self._load().get("models", [])


platform_model_registry = PlatformModelRegistry()
