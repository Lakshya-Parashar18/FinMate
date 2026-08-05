"""
Utils.py
Helper functions for score tiering, clamping, and NumPy conversions.
"""

from typing import Any, Dict
import numpy as np


def get_score_tier(score: float) -> str:
    """Classifies financial health score into standard tiers."""
    if score >= 90.0:
        return "EXCELLENT"
    elif score >= 75.0:
        return "GOOD"
    elif score >= 60.0:
        return "FAIR"
    else:
        return "NEEDS_IMPROVEMENT"


def clamp_score(score: float) -> float:
    """Clamps score between 0.0 and 100.0."""
    return round(float(np.clip(score, 0.0, 100.0)), 2)


def convert_numpy_types(obj: Any) -> Any:
    """Recursively converts NumPy types to native Python types."""
    if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(v) for v in obj]
    return obj
