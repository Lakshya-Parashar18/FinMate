"""
Merchant_normalizer.py
Normalizes raw merchant strings, removes corporate noise, city names, and transaction reference numbers.
"""

import re
import unicodedata
from typing import Tuple


class MerchantNormalizer:
    """Normalizes merchant strings into canonical brand names."""

    COMMON_SUFFIXES = [
        r"\bpvt ltd\b", r"\bprivate limited\b", r"\bltd\b", r"\blimited\b",
        r"\binc\b", r"\bcorp\b", r"\bco\b", r"\bllp\b", r"\bservices\b",
        r"\btechnologies\b", r"\benterprises\b", r"\bpay\b", r"\bpayment\b",
        r"\bonline\b", r"\bstore\b", r"\bdigital\b", r"\btrip\b", r"\bmoto\b", r"\bauto\b"
    ]

    INDIAN_CITIES = [
        "bangalore", "bengaluru", "mumbai", "delhi", "gurgaon", "noida",
        "hyderabad", "chennai", "pune", "kolkata", "ahmedabad", "jaipur",
        "lucknow", "chandigarh", "kochi", "indore"
    ]

    KNOWN_MERCHANT_MAP = {
        "swiggy": "Swiggy",
        "zomato": "Zomato",
        "dominos": "Domino's Pizza",
        "mcdonalds": "McDonald's",
        "starbucks": "Starbucks",
        "kfc": "KFC",
        "uber": "Uber",
        "ola": "Ola Cabs",
        "rapido": "Rapido",
        "indigo": "IndiGo",
        "air india": "Air India",
        "irctc": "IRCTC",
        "dmart": "D-Mart",
        "blinkit": "Blinkit",
        "zepto": "Zepto",
        "bigbasket": "BigBasket",
        "amazon": "Amazon India",
        "flipkart": "Flipkart",
        "myntra": "Myntra",
        "nykaa": "Nykaa",
        "zudio": "Zudio",
        "h&m": "H&M India",
        "zara": "Zara India",
        "decathlon": "Decathlon",
        "apple": "Apple Store",
        "netflix": "Netflix",
        "spotify": "Spotify",
        "hotstar": "Disney+ Hotstar",
        "zerodha": "Zerodha",
        "groww": "Groww",
        "apollo": "Apollo Pharmacy",
        "pharmeasy": "PharmEasy",
        "bescom": "BESCOM Electricity",
        "airtel": "Airtel Broadband",
        "jio": "JioFiber"
    }

    @classmethod
    def clean_text(cls, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
        text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
        text = text.lower()
        text = re.sub(r"[#*]\d+", "", text)
        text = re.sub(r"-\d+", "", text)
        text = re.sub(r"\b\d{4,}\b", "", text)
        text = re.sub(r"[*_/-]", " ", text)
        text = re.sub(r"[^\w\s]", "", text)
        return re.sub(r"\s+", " ", text).strip()

    @classmethod
    def normalize(cls, merchant_raw: str) -> Tuple[str, bool]:
        """
        Returns tuple of (canonical_merchant_name, is_unknown).
        """
        clean = cls.clean_text(merchant_raw)

        for key, canonical in cls.KNOWN_MERCHANT_MAP.items():
            if key in clean:
                return canonical, False

        for pattern in cls.COMMON_SUFFIXES:
            clean = re.sub(pattern, "", clean, flags=re.IGNORECASE)

        for city in cls.INDIAN_CITIES:
            clean = re.sub(rf"\b{city}\b", "", clean, flags=re.IGNORECASE)

        clean = re.sub(r"\s+", " ", clean).strip()
        normalized = clean.title() if clean else merchant_raw.strip().title()
        return normalized, True
