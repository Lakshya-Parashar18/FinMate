"""
User_profiles.py
Defines realistic Indian user personas, financial profiles, and behavioral weights.
Supports generating realistic user distributions with monthly budgets, salary payout days, and category spending distributions.
"""

import random
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import pandas as pd
from location_generator import LocationGenerator


@dataclass
class UserProfile:
    user_id: str
    name: str
    persona: str
    monthly_income: float
    monthly_budget: float
    salary_day: int  # 1-30, or -1 for irregular
    city: str
    state: str
    savings_rate: float
    impulse_spending_prob: float
    weekend_spending_multiplier: float
    category_weights: Dict[str, float]
    subscriptions_count: int
    preferred_payment_methods: Dict[str, float]

    def get_preferred_category(self) -> str:
        """Weighted random selection of a category based on persona preferences."""
        categories = list(self.category_weights.keys())
        weights = list(self.category_weights.values())
        return random.choices(categories, weights=weights, k=1)[0]

    def get_preferred_payment_method(self) -> str:
        """Weighted random selection of payment method."""
        methods = list(self.preferred_payment_methods.keys())
        weights = list(self.preferred_payment_methods.values())
        return random.choices(methods, weights=weights, k=1)[0]


class UserProfileGenerator:
    """Generates realistic synthetic user profiles based on 8 distinct financial personas."""

    PERSONA_CONFIGS = {
        "Student": {
            "income_range": (8000, 25000),
            "savings_rate_range": (0.05, 0.15),
            "salary_days": [1, 2, 5, 10],  # Allowance day
            "impulse_prob": 0.35,
            "weekend_mult": 1.6,
            "subscriptions": (1, 3),
            "category_weights": {
                "Food & Dining": 0.35,
                "Entertainment": 0.20,
                "Education": 0.15,
                "Transportation": 0.12,
                "Shopping": 0.08,
                "Grooming": 0.04,
                "Groceries": 0.03,
                "Rent & Housing": 0.00,
                "Healthcare": 0.01,
                "Utilities": 0.01,
                "Investments": 0.00,
                "Vacation": 0.01,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"UPI": 0.70, "Debit Card": 0.15, "Cash": 0.10, "Wallet": 0.05, "Credit Card": 0.00, "Net Banking": 0.00}
        },
        "Working Professional": {
            "income_range": (35000, 90000),
            "savings_rate_range": (0.15, 0.30),
            "salary_days": [1, 2, 30, 31],
            "impulse_prob": 0.20,
            "weekend_mult": 1.4,
            "subscriptions": (2, 4),
            "category_weights": {
                "Rent & Housing": 0.25,
                "Food & Dining": 0.18,
                "Groceries": 0.15,
                "Transportation": 0.12,
                "Utilities": 0.08,
                "Investments": 0.08,
                "Entertainment": 0.06,
                "Shopping": 0.04,
                "Grooming": 0.02,
                "Healthcare": 0.01,
                "Education": 0.00,
                "Vacation": 0.01,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"UPI": 0.50, "Credit Card": 0.30, "Debit Card": 0.15, "Net Banking": 0.05, "Cash": 0.00, "Wallet": 0.00}
        },
        "Software Engineer": {
            "income_range": (70000, 250000),
            "savings_rate_range": (0.25, 0.45),
            "salary_days": [1, 2, 30, 31],
            "impulse_prob": 0.25,
            "weekend_mult": 1.5,
            "subscriptions": (3, 6),
            "category_weights": {
                "Rent & Housing": 0.22,
                "Investments": 0.20,
                "Food & Dining": 0.16,
                "Shopping": 0.12,
                "Groceries": 0.10,
                "Entertainment": 0.08,
                "Transportation": 0.05,
                "Utilities": 0.04,
                "Vacation": 0.02,
                "Grooming": 0.01,
                "Education": 0.00,
                "Healthcare": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"Credit Card": 0.55, "UPI": 0.35, "Net Banking": 0.07, "Debit Card": 0.03, "Cash": 0.00, "Wallet": 0.00}
        },
        "Freelancer": {
            "income_range": (40000, 150000),
            "savings_rate_range": (0.15, 0.35),
            "salary_days": [-1],  # Irregular payouts
            "impulse_prob": 0.22,
            "weekend_mult": 1.3,
            "subscriptions": (3, 5),
            "category_weights": {
                "Food & Dining": 0.22,
                "Rent & Housing": 0.20,
                "Groceries": 0.14,
                "Investments": 0.12,
                "Utilities": 0.10,
                "Transportation": 0.08,
                "Shopping": 0.06,
                "Education": 0.04,
                "Entertainment": 0.03,
                "Grooming": 0.01,
                "Healthcare": 0.00,
                "Vacation": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"UPI": 0.60, "Credit Card": 0.25, "Net Banking": 0.10, "Debit Card": 0.05, "Cash": 0.00, "Wallet": 0.00}
        },
        "Business Owner": {
            "income_range": (100000, 500000),
            "savings_rate_range": (0.20, 0.40),
            "salary_days": [5, 10, 15],
            "impulse_prob": 0.30,
            "weekend_mult": 1.4,
            "subscriptions": (2, 5),
            "category_weights": {
                "Investments": 0.25,
                "Rent & Housing": 0.18,
                "Shopping": 0.15,
                "Food & Dining": 0.14,
                "Transportation": 0.10,
                "Groceries": 0.08,
                "Vacation": 0.04,
                "Utilities": 0.03,
                "Entertainment": 0.02,
                "Healthcare": 0.01,
                "Grooming": 0.00,
                "Education": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"Credit Card": 0.50, "Net Banking": 0.25, "UPI": 0.20, "Cash": 0.05, "Debit Card": 0.00, "Wallet": 0.00}
        },
        "Family": {
            "income_range": (60000, 180000),
            "savings_rate_range": (0.15, 0.25),
            "salary_days": [1, 2, 30],
            "impulse_prob": 0.12,
            "weekend_mult": 1.3,
            "subscriptions": (2, 4),
            "category_weights": {
                "Groceries": 0.25,
                "Rent & Housing": 0.22,
                "Education": 0.16,
                "Healthcare": 0.10,
                "Utilities": 0.09,
                "Food & Dining": 0.08,
                "Investments": 0.05,
                "Shopping": 0.03,
                "Transportation": 0.02,
                "Vacation": 0.00,
                "Entertainment": 0.00,
                "Grooming": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"UPI": 0.45, "Debit Card": 0.30, "Credit Card": 0.15, "Net Banking": 0.08, "Cash": 0.02, "Wallet": 0.00}
        },
        "Investor": {
            "income_range": (120000, 400000),
            "savings_rate_range": (0.40, 0.65),
            "salary_days": [1, 5],
            "impulse_prob": 0.08,
            "weekend_mult": 1.2,
            "subscriptions": (2, 4),
            "category_weights": {
                "Investments": 0.45,
                "Rent & Housing": 0.18,
                "Groceries": 0.12,
                "Food & Dining": 0.08,
                "Utilities": 0.06,
                "Transportation": 0.05,
                "Healthcare": 0.03,
                "Shopping": 0.02,
                "Vacation": 0.01,
                "Education": 0.00,
                "Entertainment": 0.00,
                "Grooming": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"Net Banking": 0.45, "Credit Card": 0.30, "UPI": 0.20, "Debit Card": 0.05, "Cash": 0.00, "Wallet": 0.00}
        },
        "Retired": {
            "income_range": (25000, 65000),
            "savings_rate_range": (0.10, 0.25),
            "salary_days": [1, 2, 5],  # Pension payout
            "impulse_prob": 0.05,
            "weekend_mult": 1.1,
            "subscriptions": (1, 2),
            "category_weights": {
                "Healthcare": 0.30,
                "Groceries": 0.28,
                "Utilities": 0.18,
                "Food & Dining": 0.08,
                "Rent & Housing": 0.08,
                "Investments": 0.04,
                "Transportation": 0.03,
                "Shopping": 0.01,
                "Education": 0.00,
                "Vacation": 0.00,
                "Entertainment": 0.00,
                "Grooming": 0.00,
                "Miscellaneous": 0.00
            },
            "payment_weights": {"Debit Card": 0.40, "UPI": 0.35, "Cash": 0.15, "Net Banking": 0.10, "Credit Card": 0.00, "Wallet": 0.00}
        }
    }

    FIRST_NAMES = ["Aarav", "Aditi", "Ananya", "Arjun", "Dev", "Diya", "Ishan", "Kavya", "Manish", "Neha", "Pranav", "Priya", "Rahul", "Riya", "Rohan", "Siddharth", "Sneha", "Tanvi", "Vikram", "Yash"]
    LAST_NAMES = ["Sharma", "Verma", "Gupta", "Patel", "Reddy", "Nair", "Mehta", "Joshi", "Iyer", "Rao", "Chowdhury", "Deshmukh", "Singhania", "Kapoor", "Bhat"]

    def __init__(self):
        self.location_gen = LocationGenerator()

    def generate_users(self, count: int) -> List[UserProfile]:
        users: List[UserProfile] = []
        personas = list(self.PERSONA_CONFIGS.keys())

        for i in range(count):
            user_id = f"USR_{i + 1:05d}"
            name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
            persona = random.choice(personas)
            cfg = self.PERSONA_CONFIGS[persona]

            min_inc, max_inc = cfg["income_range"]
            monthly_income = round(random.uniform(min_inc, max_inc), -2)

            min_sav, max_sav = cfg["savings_rate_range"]
            savings_rate = round(random.uniform(min_sav, max_sav), 2)

            # Monthly budget is income minus savings
            monthly_budget = round(monthly_income * (1.0 - savings_rate), -2)
            salary_day = random.choice(cfg["salary_days"])

            _, city, state = self.location_gen.get_random_location()
            sub_min, sub_max = cfg["subscriptions"]

            user = UserProfile(
                user_id=user_id,
                name=name,
                persona=persona,
                monthly_income=monthly_income,
                monthly_budget=monthly_budget,
                salary_day=salary_day,
                city=city,
                state=state,
                savings_rate=savings_rate,
                impulse_spending_prob=cfg["impulse_prob"],
                weekend_spending_multiplier=cfg["weekend_mult"],
                category_weights=cfg["category_weights"],
                subscriptions_count=random.randint(sub_min, sub_max),
                preferred_payment_methods=cfg["payment_weights"]
            )
            users.append(user)

        return users

    @staticmethod
    def export_user_profiles_dataframe(users: List[UserProfile]) -> pd.DataFrame:
        """Exports dataframe representation of user_profiles.csv."""
        rows = []
        for u in users:
            rows.append({
                "user_id": u.user_id,
                "name": u.name,
                "persona": u.persona,
                "monthly_income": u.monthly_income,
                "monthly_budget": u.monthly_budget,
                "salary_day": u.salary_day if u.salary_day != -1 else "Irregular",
                "city": u.city,
                "state": u.state,
                "savings_rate": u.savings_rate,
                "subscriptions_count": u.subscriptions_count
            })
        return pd.DataFrame(rows)
