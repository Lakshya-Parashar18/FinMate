"""
Logger.py
Provides a unified logging setup for the AI Transaction Categorization System.
"""

import logging
import sys


def get_logger(name: str = "CategorizationEngine") -> logging.Logger:
    logger_inst = logging.getLogger(name)
    logger_inst.setLevel(logging.INFO)

    if not logger_inst.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S")
        handler.setFormatter(formatter)
        logger_inst.addHandler(handler)

    return logger_inst


logger = get_logger()
