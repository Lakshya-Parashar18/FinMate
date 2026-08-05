"""
Helpers.py
Utility routines for confidence calibration, latency measurement, and object serialization.
"""

import time
from typing import Tuple, Any, Dict
import numpy as np
from utils.config import CONFIDENCE_THRESHOLDS


def calibrate_confidence(prob: float) -> str:
    """
    Calibrates a probability score into categorical levels:
    - LOW (< 70%)
    - MEDIUM (70% - 90%)
    - HIGH (> 90%)
    """
    if prob < CONFIDENCE_THRESHOLDS["LOW_MAX"]:
        return "LOW"
    elif prob < CONFIDENCE_THRESHOLDS["MEDIUM_MAX"]:
        return "MEDIUM"
    else:
        return "HIGH"


class Timer:
    """Context manager for measuring code execution latency in milliseconds."""

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        self.latency_ms = round((self.end_time - self.start_time) * 1000, 2)


def convert_numpy_types(obj: Any) -> Any:
    """Recursively converts NumPy data types to native Python types for JSON serialization."""
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
