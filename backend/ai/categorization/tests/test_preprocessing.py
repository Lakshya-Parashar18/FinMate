"""
Test_preprocessing.py
Unit tests for TextCleaner, MerchantNormalizer, and FeatureBuilder.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preprocessing.text_cleaner import TextCleaner
from preprocessing.merchant_normalizer import MerchantNormalizer
from preprocessing.feature_builder import FeatureBuilder


def test_text_cleaner():
    raw_1 = "SWIGGY*PAY#4832"
    clean_1 = TextCleaner.clean_text(raw_1)
    assert clean_1 == "swiggy pay"

    raw_2 = "Uber-Trip-2394"
    clean_2 = TextCleaner.clean_text(raw_2)
    assert clean_2 == "uber trip"

    raw_3 = "Amazon Seller Services Pvt Ltd"
    clean_3 = TextCleaner.clean_text(raw_3)
    assert "amazon seller services" in clean_3


def test_merchant_normalizer():
    raw = "TRENT LTD ZUDIO BANGALORE"
    norm = MerchantNormalizer.normalize_merchant(raw)
    assert "zudio" in norm
    assert "ltd" not in norm
    assert "bangalore" not in norm


def test_feature_builder():
    res = FeatureBuilder.build_feature_text(
        merchant="Swiggy",
        alias="SWIGGY*PAY",
        description="Chicken Biryani",
        notes="Lunch order"
    )
    assert "merchant: swiggy" in res
    assert "description: chicken biryani" in res


if __name__ == "__main__":
    test_text_cleaner()
    test_merchant_normalizer()
    test_feature_builder()
    print("All preprocessing tests passed!")
