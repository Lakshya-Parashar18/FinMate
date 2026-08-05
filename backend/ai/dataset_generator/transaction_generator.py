"""
Transaction_generator.py
Main generator core that synthesizes realistic transactions conforming strictly to the 29 output schema columns.
Combines user personas, temporal dynamics, merchant database, pricing rules, festivals, subscriptions, and anomalies.
"""

import random
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Tuple

from config import CURRENCY, SUPPORTED_CATEGORIES
from merchant_database import MerchantDatabase, Merchant
from user_profiles import UserProfile
from date_generator import DateGenerator
from amount_generator import AmountGenerator
from description_generator import DescriptionGenerator
from payment_generator import PaymentGenerator
from festival_generator import FestivalGenerator
from anomaly_generator import AnomalyGenerator
from location_generator import LocationGenerator
from utils import validate_category


class TransactionGenerator:
    """Core transaction engine that produces realistic personal finance dataset rows."""

    def __init__(self, merchant_db: MerchantDatabase, anomaly_rate: float = 0.035):
        self.merchant_db = merchant_db
        self.date_gen = DateGenerator()
        self.amount_gen = AmountGenerator()
        self.desc_gen = DescriptionGenerator()
        self.pay_gen = PaymentGenerator()
        self.fest_gen = FestivalGenerator()
        self.anom_gen = AnomalyGenerator(anomaly_rate)
        self.loc_gen = LocationGenerator()

    def generate_single_transaction(
        self,
        txn_id: str,
        user: UserProfile,
        target_date: date,
        force_category: str = None,
        force_subscription: Dict = None
    ) -> Dict[str, Any]:
        """
        Generates a single synthetic transaction dictionary row matching all 29 required schema columns.
        """
        # 1. Festival Check
        is_fest, fest_name, surge_mult = self.fest_gen.get_festival_info(target_date)

        # 2. Subscription Handling
        if force_subscription:
            is_sub = 1
            sub_freq = force_subscription.get("subscription_frequency", "Monthly")
            category = force_subscription["category"]
            merchant_name = force_subscription["merchant"]
            merchant_alias = force_subscription["merchant_alias"]
            amount = force_subscription["amount"]
            description = force_subscription["description"]
            payment_method = force_subscription["payment_method"]
            time_str = force_subscription["time"]
            is_anomaly = 0
            notes = f"Recurring {sub_freq} Subscription"
            txn_type = "expense"
        else:
            is_sub = 0
            sub_freq = "N/A"

            # Category selection
            if force_category:
                category = force_category
            else:
                # During festivals, boost Shopping / Food / Entertainment
                if is_fest and random.random() < 0.35:
                    category = random.choice(["Shopping", "Food & Dining", "Entertainment", "Vacation"])
                else:
                    category = user.get_preferred_category()

            # Ensure category is strictly valid
            validate_category(category, SUPPORTED_CATEGORIES)

            # Anomaly check
            is_anomaly = 1 if self.anom_gen.should_inject_anomaly() else 0

            if is_anomaly:
                category, amount, notes = self.anom_gen.generate_anomaly_attributes(category)
                merchant = self.merchant_db.get_random_merchant(category)
            else:
                merchant = self.merchant_db.get_random_merchant(category)
                amount = self.amount_gen.generate_amount(merchant, user, category, is_fest, False)
                notes = self.desc_gen.generate_notes(merchant, category, amount, False, False)

            merchant_name = merchant.official_name
            merchant_alias = merchant.get_random_alias(user.city)
            description = self.desc_gen.generate_description(merchant, category, False)
            payment_method = self.pay_gen.select_payment_method(user, category, amount, False)
            time_obj = DateGenerator.get_random_time_for_category(category)
            time_str = time_obj.strftime("%H:%M:%S")

            # Determine transaction type (expense vs transfer)
            if category in ["Rent & Housing", "Investments"]:
                txn_type = "transfer"
            else:
                txn_type = "expense"

        # Construct Datetime
        t_hour, t_min, t_sec = map(int, time_str.split(":"))
        dt = datetime(target_date.year, target_date.month, target_date.day, t_hour, t_min, t_sec)

        # Location
        location_str, city, state = self.loc_gen.get_random_location(user.city)

        # Temporal metadata
        temp_meta = DateGenerator.extract_temporal_metadata(dt)

        # Return full 29-column dictionary
        return {
            "transaction_id": txn_id,
            "user_id": user.user_id,
            "date": temp_meta["date"],
            "time": temp_meta["time"],
            "merchant": merchant_name,
            "merchant_alias": merchant_alias,
            "description": description,
            "amount": amount,
            "currency": CURRENCY,
            "category": category,
            "payment_method": payment_method,
            "location": location_str,
            "city": city,
            "state": state,
            "day_of_week": temp_meta["day_of_week"],
            "month": temp_meta["month"],
            "year": temp_meta["year"],
            "hour": temp_meta["hour"],
            "minute": temp_meta["minute"],
            "is_weekend": temp_meta["is_weekend"],
            "is_subscription": is_sub,
            "subscription_frequency": sub_freq,
            "income": user.monthly_income,
            "user_persona": user.persona,
            "salary_day": user.salary_day if user.salary_day != -1 else "Irregular",
            "budget": user.monthly_budget,
            "transaction_type": txn_type,
            "is_anomaly": is_anomaly,
            "notes": notes
        }

    def generate_salary_income_transaction(
        self,
        txn_id: str,
        user: UserProfile,
        target_date: date
    ) -> Dict[str, Any]:
        """Generates a monthly Salary / Income credit transaction."""
        time_str = "09:30:00"
        dt = datetime(target_date.year, target_date.month, target_date.day, 9, 30, 0)
        temp_meta = DateGenerator.extract_temporal_metadata(dt)

        employer_name = f"{user.persona.replace(' ', '')} Corporate Payout"
        location_str, city, state = self.loc_gen.get_random_location(user.city)

        return {
            "transaction_id": txn_id,
            "user_id": user.user_id,
            "date": temp_meta["date"],
            "time": temp_meta["time"],
            "merchant": employer_name,
            "merchant_alias": f"SALARY/{user.name.upper().replace(' ', '')}",
            "description": f"Monthly Salary Credit - {dt.strftime('%B %Y')}",
            "amount": user.monthly_income,
            "currency": CURRENCY,
            "category": "Miscellaneous",
            "payment_method": "Net Banking",
            "location": location_str,
            "city": city,
            "state": state,
            "day_of_week": temp_meta["day_of_week"],
            "month": temp_meta["month"],
            "year": temp_meta["year"],
            "hour": temp_meta["hour"],
            "minute": temp_meta["minute"],
            "is_weekend": temp_meta["is_weekend"],
            "is_subscription": 0,
            "subscription_frequency": "N/A",
            "income": user.monthly_income,
            "user_persona": user.persona,
            "salary_day": user.salary_day if user.salary_day != -1 else "Irregular",
            "budget": user.monthly_budget,
            "transaction_type": "income",
            "is_anomaly": 0,
            "notes": f"Salary payout for {user.persona}"
        }
