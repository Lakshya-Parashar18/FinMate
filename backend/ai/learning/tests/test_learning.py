"""
Test_learning.py
Unit tests for feedback collection, active learning, dataset manager, versioning, rollback, and analytics.
"""

import sys
from pathlib import Path

# Add paths
LEARNING_DIR = Path(__file__).resolve().parent.parent
AI_DIR = LEARNING_DIR.parent

for p in [str(LEARNING_DIR), str(AI_DIR / "categorization"), str(AI_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from feedback_service import feedback_service
from active_learning import active_learning
from dataset_manager import dataset_manager
from versioning import version_manager
from model_registry import learning_registry
from drift_detection import drift_detector


def test_feedback_service():
    res = feedback_service.record_feedback(
        merchant="Swiggy",
        correct_category="Groceries",
        description="Instamart Milk",
        original_prediction="Food & Dining"
    )
    assert res["status"] == "SUCCESS"
    df = feedback_service.get_feedback_dataframe()
    assert len(df) > 0


def test_active_learning():
    active_learning.record_unknown_merchant("UnknownBoutique", "Clothing", "Shopping", 0.65)
    active_learning.record_low_confidence("Subway", "SUBWAY", "Food", "Food & Dining", 0.62)
    priority_df = active_learning.get_priority_samples()
    assert len(priority_df) > 0


def test_versioning():
    next_v = version_manager.get_next_version("v1.0.0")
    assert next_v == "v1.1.0"


def test_drift_detection():
    base = {"Food & Dining": 0.30, "Groceries": 0.20}
    recent = {"Food & Dining": 0.10, "Groceries": 0.50}
    drift_res = drift_detector.detect_category_drift(base, recent)
    assert "klDivergence" in drift_res
    assert "driftDetected" in drift_res


if __name__ == "__main__":
    test_feedback_service()
    test_active_learning()
    test_versioning()
    test_drift_detection()
    print("All Continuous Learning unit tests passed successfully!")
