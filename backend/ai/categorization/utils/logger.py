"""
Logger.py
Provides a unified logging setup for the AI Transaction Categorization System.
"""

import logging
import sys

def get_logger(name: str = "CategorizationEngine") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

logger = get_logger()
