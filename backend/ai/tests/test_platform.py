"""
Test_platform.py
Platform unit test suite for AI Gateway, Embedding Service, Feature Store, Model Registry, and Dataset Versioner.
"""

import sys
from pathlib import Path

# Add backend/ai to sys.path
AI_DIR = Path(__file__).resolve().parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from gateway.ai_gateway import ai_gateway
from embeddings.embedding_service import platform_embedding_service
from feature_store.feature_store import central_feature_store
from registry.model_registry import platform_model_registry
from datasets.dataset_versioner import dataset_versioner


def test_ai_gateway_categorize():
    res = ai_gateway.categorize_transaction(
        merchant="SWIGGY*PAY BANGALORE",
        description="Chicken Biryani"
    )
    assert "predictedCategory" in res
    assert res["predictedCategory"] in ["Food & Dining", "Miscellaneous"]


def test_embedding_service():
    vec = platform_embedding_service.encode_single("merchant: swiggy")
    assert vec.shape == (384,)


def test_feature_store():
    central_feature_store.update_merchant_feature("Swiggy", "Swiggy", 250.0, "Food & Dining")
    feat = central_feature_store.get_merchant_features("Swiggy")
    assert feat["frequency_count"] >= 1


def test_model_registry():
    active = platform_model_registry.get_active_model_metadata()
    assert active is not None


if __name__ == "__main__":
    test_ai_gateway_categorize()
    test_embedding_service()
    test_feature_store()
    test_model_registry()
    print("All FinMate AI Platform unit tests passed successfully!")
