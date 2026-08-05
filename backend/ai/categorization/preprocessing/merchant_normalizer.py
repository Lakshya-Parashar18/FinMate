"""
Merchant_normalizer.py
Normalizes Indian corporate suffixes, bank transaction codes, and city locations from raw merchant strings.
"""

import re
from preprocessing.text_cleaner import TextCleaner


class MerchantNormalizer:
    """Normalizes raw merchant aliases into clean canonical merchant string tokens."""

    COMMON_SUFFIXES = [
        r"\bpvt ltd\b", r"\bprivate limited\b", r"\bltd\b", r"\blimited\b",
        r"\binc\b", r"\bcorp\b", r"\bco\b", r"\bllp\b", r"\bservices\b",
        r"\btechnologies\b", r"\benterprises\b", r"\bpay\b", r"\bpayment\b",
        r"\bonline\b", r"\bstore\b", r"\bdigital\b"
    ]

    INDIAN_CITIES = [
        "bangalore", "bengaluru", "mumbai", "delhi", "gurgaon", "noida",
        "hyderabad", "chennai", "pune", "kolkata", "ahmedabad", "jaipur",
        "lucknow", "chandigarh", "kochi", "indore"
    ]

    @classmethod
    def normalize_merchant(cls, merchant_raw: str) -> str:
        """Cleans and strips corporate noise words & city suffixes from merchant strings."""
        clean = TextCleaner.clean_text(merchant_raw)

        # Strip corporate noise suffixes
        for pattern in cls.COMMON_SUFFIXES:
            clean = re.sub(pattern, "", clean, flags=re.IGNORECASE)

        # Strip city suffixes
        for city in cls.INDIAN_CITIES:
            clean = re.sub(rf"\b{city}\b", "", clean, flags=re.IGNORECASE)

        # Final space cleanup
        clean = re.sub(r"\s+", " ", clean).strip()

        return clean if clean else TextCleaner.clean_text(merchant_raw)
