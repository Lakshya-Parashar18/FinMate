"""
Helpers.py
Utility classes and helpers for timing, numpy conversion, and probability formatting.
"""

import time
from typing import Any, Dict, List
import numpy as np


class Timer:
    """Context manager measuring execution latency in milliseconds."""

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        self.latency_ms = round((self.end_time - self.start_time) * 1000, 2)


def convert_numpy_types(obj: Any) -> Any:
    """Recursively converts NumPy data types to native Python types."""
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
