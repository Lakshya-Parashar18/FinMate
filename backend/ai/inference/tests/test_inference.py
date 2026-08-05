"""
Test_inference.py
Unit tests for single prediction, batch prediction, unknown merchant handling, and failsafe behavior.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from merchant_service import MerchantService
from confidence_service import ConfidenceService
from prediction_service import prediction_service
from batch_service import batch_service
from health_service import HealthService


def test_merchant_service():
    norm, is_unk = MerchantService.normalize_merchant("SWIGGY*PAY#4832 BANGALORE")
    assert norm == "Swiggy"
    assert is_unk is False

    norm_unk, is_unk2 = MerchantService.normalize_merchant("RANDOM_UNKNOWN_BOUTIQUE_STORE")
    assert is_unk2 is True


def test_confidence_calibration():
    assert ConfidenceService.calibrate_level(0.95) == "HIGH"
    assert ConfidenceService.calibrate_level(0.75) == "MEDIUM"
    assert ConfidenceService.calibrate_level(0.50) == "LOW"


def test_failsafe_prediction():
    payload = {
        "merchant": "Uber Trip Bangalore",
        "description": "Cab ride to airport"
    }
    res = prediction_service.process_transaction(payload)
    assert "category" in res
    assert res["category"] in ["Transportation", "Miscellaneous"]
    assert "confidence" in res


def test_batch_prediction():
    items = [
        {"merchant": "Swiggy", "description": "Chicken Biryani"},
        {"merchant": "Uber", "description": "Auto ride"}
    ]
    batch_res = batch_service.process_batch(items)
    assert batch_res["processedCount"] == 2
    assert len(batch_res["transactions"]) == 2


if __name__ == "__main__":
    test_merchant_service()
    test_confidence_calibration()
    test_failsafe_prediction()
    test_batch_prediction()
    print("All inference unit tests passed successfully!")
