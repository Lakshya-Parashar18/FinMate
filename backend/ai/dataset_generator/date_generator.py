"""
Date_generator.py
Generates realistic timestamps, time-of-day distributions, salary days, and temporal metadata.
"""

import random
from datetime import datetime, date, time, timedelta
from typing import Tuple, Dict


class DateGenerator:
    """Generates realistic temporal patterns for transactions."""

    DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # Typical time windows per category
    CATEGORY_TIME_WINDOWS = {
        "Food & Dining": [
            ((7, 30), (10, 0), 0.15),   # Breakfast
            ((12, 0), (14, 30), 0.35),  # Lunch
            ((16, 0), (17, 30), 0.15),  # Tea/Snacks
            ((19, 0), (22, 30), 0.35)   # Dinner
        ],
        "Groceries": [
            ((9, 0), (12, 0), 0.35),
            ((16, 0), (20, 30), 0.65)
        ],
        "Transportation": [
            ((8, 0), (10, 30), 0.40),  # Morning Commute
            ((17, 0), (20, 30), 0.40),  # Evening Commute
            ((11, 0), (16, 0), 0.20)
        ],
        "Rent & Housing": [
            ((8, 0), (12, 0), 1.0)
        ],
        "Entertainment": [
            ((14, 0), (17, 0), 0.25),
            ((18, 0), (23, 30), 0.75)
        ],
        "Healthcare": [
            ((9, 0), (13, 0), 0.50),
            ((16, 0), (20, 0), 0.50)
        ],
        "Education": [
            ((9, 0), (16, 0), 1.0)
        ],
        "Shopping": [
            ((11, 0), (14, 0), 0.30),
            ((16, 0), (21, 0), 0.70)
        ],
        "Utilities": [
            ((9, 0), (14, 0), 1.0)
        ],
        "Investments": [
            ((9, 15), (15, 30), 0.90),  # Stock market hours
            ((6, 0), (9, 0), 0.10)
        ],
        "Vacation": [
            ((6, 0), (23, 0), 1.0)
        ],
        "Grooming": [
            ((10, 0), (19, 0), 1.0)
        ],
        "Miscellaneous": [
            ((8, 0), (22, 0), 1.0)
        ]
    }

    @staticmethod
    def get_random_time_for_category(category: str) -> time:
        """Returns a realistic time of day based on the transaction category."""
        windows = DateGenerator.CATEGORY_TIME_WINDOWS.get(category, [((8, 0), (22, 0), 1.0)])

        # Pick window based on probability weights
        weights = [w[2] for w in windows]
        chosen_window = random.choices(windows, weights=weights, k=1)[0]

        start_h, start_m = chosen_window[0]
        end_h, end_m = chosen_window[1]

        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m

        random_minute = random.randint(start_minutes, end_minutes)
        hour = (random_minute // 60) % 24
        minute = random_minute % 60
        second = random.randint(0, 59)

        return time(hour=hour, minute=minute, second=second)

    @staticmethod
    def extract_temporal_metadata(dt: datetime) -> Dict[str, str]:
        """Extracts date, time, day_of_week, month, year, hour, minute, is_weekend from a datetime."""
        day_of_week = DateGenerator.DAYS_OF_WEEK[dt.weekday()]
        is_weekend = 1 if dt.weekday() in [5, 6] else 0

        return {
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M:%S"),
            "day_of_week": day_of_week,
            "month": dt.month,
            "year": dt.year,
            "hour": dt.hour,
            "minute": dt.minute,
            "is_weekend": is_weekend
        }
