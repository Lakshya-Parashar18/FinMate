"""
Config.py
Configuration parameters for the FinMate Synthetic Financial Dataset Generator.
Supports modular customization for data scaling from 10k to 1,000,000+ rows.
"""

from pathlib import Path
from typing import List

# ==============================================================================
# GENERAL DATASET PARAMETERS
# ==============================================================================
DEFAULT_NUMBER_OF_USERS: int = 500
DEFAULT_NUMBER_OF_TRANSACTIONS: int = 100000

START_DATE: str = "2025-01-01"
END_DATE: str = "2025-12-31"

CURRENCY: str = "INR"
CURRENCY_SYMBOL: str = "₹"

# Chunking for high-performance memory efficiency (e.g., 1 Million rows)
CHUNK_SIZE: int = 50000

# ==============================================================================
# FEATURE TOGGLES
# ==============================================================================
ENABLE_FESTIVALS: bool = True
ENABLE_ANOMALIES: bool = True
ENABLE_SUBSCRIPTIONS: bool = True
ENABLE_WEEKEND_PATTERNS: bool = True
ENABLE_SEASONAL_SPENDING: bool = True
ENABLE_USER_PERSONAS: bool = True

# Target anomaly percentage range (e.g. 0.03 = 3%)
ANOMALY_PERCENTAGE: float = 0.035

# Output format option: "CSV", "JSON", or "BOTH"
OUTPUT_FORMAT: str = "BOTH"

# ==============================================================================
# STRICTLY ALLOWED CATEGORIES (NO ADDITIONAL CATEGORIES ALLOWED)
# ==============================================================================
SUPPORTED_CATEGORIES: List[str] = [
    "Food & Dining",
    "Groceries",
    "Transportation",
    "Rent & Housing",
    "Entertainment",
    "Healthcare",
    "Education",
    "Shopping",
    "Utilities",
    "Investments",
    "Vacation",
    "Grooming",
    "Miscellaneous"
]

# ==============================================================================
# PAYMENT METHODS
# ==============================================================================
PAYMENT_METHODS: List[str] = [
    "UPI",
    "Credit Card",
    "Debit Card",
    "Cash",
    "Net Banking",
    "Wallet"
]

# ==============================================================================
# USER PERSONAS
# ==============================================================================
PERSONAS: List[str] = [
    "Student",
    "Working Professional",
    "Software Engineer",
    "Freelancer",
    "Business Owner",
    "Family",
    "Investor",
    "Retired"
]

# ==============================================================================
# OUTPUT PATHS
# ==============================================================================
BASE_DIR: Path = Path(__file__).resolve().parent
OUTPUT_DIR: Path = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRANSACTIONS_CSV_PATH: Path = OUTPUT_DIR / "synthetic_transactions.csv"
TRANSACTIONS_JSON_PATH: Path = OUTPUT_DIR / "synthetic_transactions.json"
MERCHANT_METADATA_CSV_PATH: Path = OUTPUT_DIR / "merchant_metadata.csv"
USER_PROFILES_CSV_PATH: Path = OUTPUT_DIR / "user_profiles.csv"
MERCHANT_ALIASES_CSV_PATH: Path = OUTPUT_DIR / "merchant_aliases.csv"
