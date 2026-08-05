"""
Config.py
Configuration parameters for the AI Financial Intelligence Engine.
"""

from pathlib import Path
from typing import Dict, List, Tuple

# Paths
FINANCIAL_HEALTH_DIR: Path = Path(__file__).resolve().parent
AI_DIR: Path = FINANCIAL_HEALTH_DIR.parent

TRAINED_MODELS_DIR: Path = FINANCIAL_HEALTH_DIR / "trained_models"
TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

HEALTH_MODEL_PATH: Path = TRAINED_MODELS_DIR / "health_model.pkl"
HEALTH_METADATA_PATH: Path = TRAINED_MODELS_DIR / "health_metadata.json"

# Score Categories & Tiers
SCORE_TIERS: Dict[str, Tuple[float, float]] = {
    "EXCELLENT": (90.0, 100.0),
    "GOOD": (75.0, 89.99),
    "FAIR": (60.0, 74.99),
    "NEEDS_IMPROVEMENT": (0.0, 59.99)
}

# Sub-Scores (0-100)
SUB_SCORE_WEIGHTS: Dict[str, float] = {
    "savings": 0.15,
    "budget_discipline": 0.15,
    "investment_habits": 0.15,
    "lifestyle_balance": 0.10,
    "expense_stability": 0.10,
    "financial_consistency": 0.05,
    "emergency_preparedness": 0.10,
    "goal_progress": 0.05,
    "cash_flow_management": 0.10,
    "risk_exposure": 0.05
}

# Essential vs Non-Essential Categories
ESSENTIAL_CATEGORIES: List[str] = [
    "Groceries", "Rent & Housing", "Utilities", "Healthcare", "Education", "Transportation"
]

NON_ESSENTIAL_CATEGORIES: List[str] = [
    "Food & Dining", "Entertainment", "Shopping", "Vacation", "Grooming", "Miscellaneous"
]
