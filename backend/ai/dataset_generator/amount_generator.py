"""
Amount_generator.py
Generates realistic Indian Rupee (INR) amounts based on category norms, merchant ranges,
user monthly income, festival surges, and anomaly spikes.
"""

import random
from typing import Optional
from merchant_database import Merchant
from user_profiles import UserProfile
from utils import round_indian_currency


class AmountGenerator:
    """Generates realistic transaction amounts in INR."""

    # Fallback ranges per category if merchant ranges are default
    CATEGORY_AMOUNT_RANGES = {
        "Food & Dining": (120, 2500),
        "Groceries": (250, 6000),
        "Transportation": (70, 4500),
        "Rent & Housing": (6000, 45000),
        "Entertainment": (149, 3500),
        "Healthcare": (100, 6000),
        "Education": (499, 25000),
        "Shopping": (350, 45000),
        "Utilities": (399, 8000),
        "Investments": (500, 50000),
        "Vacation": (2500, 45000),
        "Grooming": (250, 4500),
        "Miscellaneous": (50, 3000)
    }

    @staticmethod
    def generate_amount(
        merchant: Merchant,
        user: UserProfile,
        category: str,
        is_festival: bool = False,
        is_anomaly: bool = False
    ) -> float:
        """
        Calculates a realistic amount considering merchant range, user income level,
        festival spending multipliers, and anomaly spikes.
        """
        min_amt = merchant.typical_min_amount
        max_amt = merchant.typical_max_amount

        # Scale based on user monthly income percentile
        income_tier_ratio = min(max(user.monthly_income / 100000.0, 0.5), 3.0)

        # Baseline amount generation using triangular or lognormal distribution
        mode_amt = min_amt + (max_amt - min_amt) * 0.3
        raw_amt = random.triangular(min_amt, max_amt, mode_amt) * (0.8 + 0.4 * (income_tier_ratio - 0.5))

        # Ensure within merchant bounds
        raw_amt = max(min_amt, min(raw_amt, max_amt * 1.5))

        # Festival surge (1.25x - 2.5x for Shopping, Vacation, Food, Entertainment)
        if is_festival and category in ["Shopping", "Vacation", "Food & Dining", "Entertainment"]:
            raw_amt *= random.uniform(1.25, 2.2)

        # Anomaly surge (4x - 15x normal spending or large high-value item)
        if is_anomaly:
            if category == "Shopping":  # Laptop / Luxury Purchase
                raw_amt = random.uniform(35000, 150000)
            elif category == "Food & Dining":  # Luxury 5-Star Hotel Dinner
                raw_amt = random.uniform(5000, 18000)
            elif category == "Transportation":  # International Flight / Fleet
                raw_amt = random.uniform(15000, 55000)
            else:
                raw_amt *= random.uniform(4.0, 12.0)

        # Psychological Indian pricing adjustment (e.g. ending in 99, 499, 999 for shopping/subscriptions)
        if category in ["Shopping", "Entertainment", "Education"] and raw_amt > 199 and not is_anomaly:
            if random.random() < 0.4:
                hundreds = int(raw_amt // 100)
                if hundreds > 0:
                    raw_amt = (hundreds * 100) - 1

        return round_indian_currency(max(10.0, raw_amt))
