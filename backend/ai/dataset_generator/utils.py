"""
Utils.py
Helper functions, logging setup, date utilities, and validation routines for the dataset generator.
"""

import logging
import random
import sys
from datetime import datetime, date, timedelta
from typing import Union, List
import numpy as np

# Configure Logging
logger = logging.getLogger("DatasetGenerator")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S")
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)


def set_random_seed(seed: int = 42) -> None:
    """Sets random seed for reproducibility across Python, random, and NumPy."""
    random.seed(seed)
    np.random.seed(seed)
    logger.info(f"Random seed set to {seed}")


def parse_date(date_str: str) -> date:
    """Parses a YYYY-MM-DD string into a datetime.date object."""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def format_date(dt: Union[datetime, date]) -> str:
    """Formats a date or datetime object into YYYY-MM-DD string."""
    return dt.strftime("%Y-%m-%d")


def format_time(dt: datetime) -> str:
    """Formats a datetime object into HH:MM:SS string."""
    return dt.strftime("%H:%M:%S")


def get_days_in_range(start_date_str: str, end_date_str: str) -> List[date]:
    """Returns a list of all date objects between start_date and end_date inclusive."""
    s_date = parse_date(start_date_str)
    e_date = parse_date(end_date_str)
    delta = (e_date - s_date).days
    return [s_date + timedelta(days=i) for i in range(delta + 1)]


def round_indian_currency(amount: float) -> float:
    """Rounds amount to realistic Indian pricing decimals or round integers."""
    if amount < 100:
        return round(amount, 2)
    elif amount < 1000:
        # Common pricing ending in .00 or .50
        return round(amount * 2) / 2
    else:
        return round(amount, 2)


def validate_category(category: str, allowed_categories: List[str]) -> bool:
    """Validates that a category belongs strictly to the allowed list."""
    if category not in allowed_categories:
        logger.error(f"Invalid category encountered: {category}")
        raise ValueError(f"Category '{category}' is not in allowed categories list.")
    return True
