"""
Metrics.py
Calculates comprehensive evaluation metrics: Accuracy, Top-3 Accuracy, Precision, Recall, F1,
Classification Report, Confusion Matrix, and Per-category metrics.
"""

from typing import Dict, Any, List
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)
from engine_utils.helpers import convert_numpy_types


class ModelMetrics:
    """Computes comprehensive evaluation metrics for multi-class classification."""

    @staticmethod
    def calculate_top_k_accuracy(y_true: np.ndarray, y_prob: np.ndarray, k: int = 3) -> float:
        """Calculates Top-K Accuracy score."""
        top_k_preds = np.argsort(y_prob, axis=1)[:, -k:]
        correct = 0
        for idx, label_idx in enumerate(y_true):
            if label_idx in top_k_preds[idx]:
                correct += 1
        return round(correct / len(y_true), 4)

    @staticmethod
    def evaluate_model(
        y_true: List[str],
        y_pred: List[str],
        y_prob: np.ndarray,
        classes: List[str]
    ) -> Dict[str, Any]:
        """
        Calculates all key model evaluation metrics.
        """
        acc = float(accuracy_score(y_true, y_pred))

        # Map class names to indices
        class_to_idx = {c: i for i, c in enumerate(classes)}
        y_true_indices = np.array([class_to_idx[y] for y in y_true])

        top3_acc = ModelMetrics.calculate_top_k_accuracy(y_true_indices, y_prob, k=3)

        precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
        macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)

        # Classification report dict
        report_dict = classification_report(y_true, y_pred, target_names=classes, output_dict=True, zero_division=0)

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=classes)

        # Per Category Accuracy
        per_category_acc = {}
        for i, category in enumerate(classes):
            total_cat = np.sum(cm[i, :])
            correct_cat = cm[i, i]
            per_category_acc[category] = round(float(correct_cat / total_cat), 4) if total_cat > 0 else 0.0

        metrics = {
            "accuracy": round(acc, 4),
            "top3_accuracy": round(top3_acc, 4),
            "precision_weighted": round(float(precision), 4),
            "recall_weighted": round(float(recall), 4),
            "f1_weighted": round(float(f1), 4),
            "precision_macro": round(float(macro_p), 4),
            "recall_macro": round(float(macro_r), 4),
            "f1_macro": round(float(macro_f1), 4),
            "per_category_accuracy": per_category_acc,
            "confusion_matrix": cm.tolist(),
            "classification_report": report_dict,
            "classes": classes
        }

        return convert_numpy_types(metrics)
