"""
Festival_generator.py
Defines major Indian shopping sales, festivals, and holiday seasons,
providing surge probabilities and multipliers for Shopping, Vacation, Food, and Entertainment.
"""

from datetime import date
from typing import Optional, Dict, Tuple


class FestivalGenerator:
    """Detects Indian shopping sales & festivals and applies spending multipliers."""

    FESTIVAL_CALENDAR = [
        # (Start Month, Start Day, End Month, End Day, Festival Name, Boosted Categories, Surge Factor)
        (1, 20, 1, 27, "Republic Day Sale", ["Shopping", "Entertainment"], 1.35),
        (3, 20, 3, 27, "Holi Festival Shopping", ["Shopping", "Groceries", "Food & Dining"], 1.25),
        (8, 15, 8, 25, "Raksha Bandhan & Independence Sale", ["Shopping", "Groceries", "Grooming"], 1.30),
        (9, 20, 10, 10, "Great Indian Festival & Big Billion Days", ["Shopping", "Entertainment"], 1.75),
        (10, 15, 11, 5, "Diwali Festive Season", ["Shopping", "Groceries", "Food & Dining", "Vacation", "Grooming"], 2.10),
        (11, 20, 11, 30, "Black Friday Sale", ["Shopping", "Entertainment"], 1.50),
        (11, 15, 12, 20, "Indian Wedding Season", ["Shopping", "Vacation", "Grooming", "Food & Dining"], 1.80),
        (12, 22, 1, 2, "Christmas & New Year Celebration", ["Vacation", "Food & Dining", "Entertainment", "Shopping"], 1.90),
    ]

    @staticmethod
    def get_festival_info(dt: date) -> Tuple[bool, Optional[str], float]:
        """
        Returns (is_festival, festival_name, surge_factor).
        """
        m, d = dt.month, dt.day

        for start_m, start_d, end_m, end_d, name, cats, surge in FestivalGenerator.FESTIVAL_CALENDAR:
            # Simple month/day date range check
            if start_m == end_m:
                if start_m == m and start_d <= d <= end_d:
                    return True, name, surge
            else:  # Spans across month boundary
                if (m == start_m and d >= start_d) or (m == end_m and d <= end_d) or (start_m < m < end_m):
                    return True, name, surge

        return False, None, 1.0
