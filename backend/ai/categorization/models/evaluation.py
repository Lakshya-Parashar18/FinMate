"""
Evaluation.py
Evaluates multiple classifier models on validation data, selects the highest performing model,
and exports detailed JSON evaluation reports and confusion matrices into training_logs/.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
from models.metrics import ModelMetrics
from engine_utils.config import TRAINING_LOGS_DIR
from engine_utils.logger import logger


class Evaluator:
    """Benchmark evaluation runner across multiple candidate classifiers."""

    def __init__(self, logs_dir: Path = TRAINING_LOGS_DIR):
        self.logs_dir = logs_dir
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def evaluate_candidates(
        self,
        trained_models: Dict[str, Any],
        X_val: np.ndarray,
        y_val: List[str],
        classes: List[str]
    ) -> Tuple[str, Any, Dict[str, Any]]:
        """
        Evaluates all trained candidate classifiers and selects the one with the highest F1-weighted score.
        Returns (best_model_name, best_model_instance, best_metrics_dict).
        """
        best_name = None
        best_model = None
        best_metrics = None
        best_score = -1.0

        all_results = {}

        for name, model in trained_models.items():
            logger.info(f"Evaluating classifier: {name}...")
            y_pred = model.predict(X_val)

            if hasattr(model, "predict_proba"):
                y_prob = model.predict_proba(X_val)
            else:
                # Fallback to one-hot for non-probabilistic models
                y_prob = np.zeros((len(y_pred), len(classes)))
                class_to_idx = {c: i for i, c in enumerate(classes)}
                for i, p in enumerate(y_pred):
                    y_prob[i, class_to_idx[p]] = 1.0

            metrics = ModelMetrics.evaluate_model(y_val, y_pred, y_prob, classes)
            all_results[name] = metrics

            score = metrics["f1_weighted"]
            logger.info(f"Model '{name}' -> Accuracy: {metrics['accuracy']:.4f}, Top-3 Acc: {metrics['top3_accuracy']:.4f}, F1-Weighted: {metrics['f1_weighted']:.4f}")

            if score > best_score:
                best_score = score
                best_name = name
                best_model = model
                best_metrics = metrics

        # Save evaluation report to logs
        report_path = self.logs_dir / "evaluation_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({
                "best_model": best_name,
                "best_f1_score": best_score,
                "all_models_summary": {k: {"accuracy": v["accuracy"], "f1_weighted": v["f1_weighted"]} for k, v in all_results.items()},
                "detailed_metrics": all_results
            }, f, indent=2)

        # Save confusion matrix to logs
        cm_path = self.logs_dir / "confusion_matrix.json"
        with open(cm_path, "w", encoding="utf-8") as f:
            json.dump({
                "best_model": best_name,
                "classes": classes,
                "confusion_matrix": best_metrics["confusion_matrix"]
            }, f, indent=2)

        logger.info(f"Selected Best Classifier: '{best_name}' (F1 Score: {best_score:.4f})")
        return best_name, best_model, best_metrics
