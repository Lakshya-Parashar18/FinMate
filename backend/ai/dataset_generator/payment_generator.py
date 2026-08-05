"""
Payment_generator.py
Generates realistic Indian payment methods (UPI, Credit Card, Debit Card, Cash, Net Banking, Wallet)
adjusted by category, transaction amount, and user persona preferences.
"""

import random
from typing import List
from user_profiles import UserProfile


class PaymentGenerator:
    """Selects realistic payment methods based on contextual transaction attributes."""

    @staticmethod
    def select_payment_method(
        user: UserProfile,
        category: str,
        amount: float,
        is_subscription: bool = False
    ) -> str:
        """Determines the payment method using weighted persona probabilities and category rules."""

        if is_subscription:
            return random.choice(["Credit Card", "UPI", "Net Banking"])

        # Category-based overrides for high realism
        if category in ["Rent & Housing", "Investments"] and amount > 5000:
            return random.choices(["Net Banking", "UPI", "Credit Card"], weights=[0.50, 0.35, 0.15], k=1)[0]

        if category == "Transportation" and amount < 300:
            return random.choices(["UPI", "Cash", "Wallet"], weights=[0.75, 0.15, 0.10], k=1)[0]

        if category in ["Shopping", "Vacation"] and amount > 8000:
            return random.choices(["Credit Card", "UPI", "Debit Card", "Net Banking"], weights=[0.60, 0.25, 0.10, 0.05], k=1)[0]

        # Use user persona's weighted preference
        return user.get_preferred_payment_method()
