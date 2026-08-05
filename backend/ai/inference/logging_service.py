"""
Logging_service.py
Structured production logger for AI inference events, latency, cache hits, unknown merchants, and fallbacks.
"""

import logging
import sys


def get_inference_logger(name: str = "AIInferenceEngine") -> logging.Logger:
    logger_inst = logging.getLogger(name)
    logger_inst.setLevel(logging.INFO)

    if not logger_inst.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S")
        handler.setFormatter(formatter)
        logger_inst.addHandler(handler)

    return logger_inst


logger = get_inference_logger()
