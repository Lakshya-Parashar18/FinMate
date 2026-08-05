"""
Anomaly_generator.py
Generates 2-5% financial anomalies (e.g., massive electronics purchases, luxury dining,
abnormal ATM withdrawals, international charges) for training AI Anomaly Detection models.
"""

import random
from typing import Tuple, Dict


class AnomalyGenerator:
    """Injects financial anomalies into transactions."""

    ANOMALY_TYPES = [
        ("Massive Electronics Purchase", "Shopping", 35000, 150000, "Flagged: Abnormally high high-end gadget purchase"),
        ("Luxury 5-Star Hotel Dining", "Food & Dining", 6000, 22000, "Flagged: High-end luxury restaurant billing"),
        ("Huge Cash ATM Withdrawal", "Miscellaneous", 20000, 50000, "Flagged: Unusual high-volume cash withdrawal"),
        ("International Flight Booking", "Vacation", 25000, 120000, "Flagged: Sudden high-value overseas travel charge"),
        ("Abnormal Fuel Fleet Payment", "Transportation", 8000, 25000, "Flagged: Fuel purchase exceeding vehicle tank capacity"),
        ("Luxury Brand Shopping Surge", "Shopping", 25000, 95000, "Flagged: Out-of-pattern luxury designer fashion purchase")
    ]

    def __init__(self, anomaly_rate: float = 0.035):
        self.anomaly_rate = anomaly_rate

    def should_inject_anomaly(self) -> bool:
        """Determines if a transaction should be an anomaly based on target percentage."""
        return random.random() < self.anomaly_rate

    def generate_anomaly_attributes(self, default_category: str) -> Tuple[str, float, str]:
        """
        Returns (category, anomaly_amount, anomaly_notes).
        """
        anomaly_choice = random.choice(self.ANOMALY_TYPES)
        a_type, category, min_a, max_a, note = anomaly_choice

        amount = round(random.uniform(min_a, max_a), 2)
        return category, amount, note
