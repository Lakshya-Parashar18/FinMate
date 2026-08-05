"""
Logger.py
Platform-wide logging setup for the FinMate AI Platform.
"""

import logging
import sys


def get_logger(name: str = "AIPlatform") -> logging.Logger:
    logger_inst = logging.getLogger(name)
    logger_inst.setLevel(logging.INFO)

    if not logger_inst.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S")
        handler.setFormatter(formatter)
        logger_inst.addHandler(handler)

    return logger_inst


logger = get_logger()
