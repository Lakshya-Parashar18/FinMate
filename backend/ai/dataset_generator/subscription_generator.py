"""
Subscription_generator.py
Schedules and tracks recurring subscriptions (Netflix, Spotify, Prime Video, Internet, Rent, Gym, Phone Bills)
to ensure exact 30-day / monthly recurrence patterns across the date range.
"""

from datetime import date, timedelta, datetime
from typing import List, Dict, Tuple
import random
from merchant_database import MerchantDatabase, Merchant
from user_profiles import UserProfile


class SubscriptionGenerator:
    """Generates and tracks recurring subscription transactions per user."""

    def __init__(self, merchant_db: MerchantDatabase):
        self.merchant_db = merchant_db

    def assign_user_subscriptions(self, user: UserProfile, start_date: date, end_date: date) -> List[Dict]:
        """
        Assigns recurring subscription schedules for a user based on their persona
        and subscription count. Returns list of scheduled subscription transaction dicts.
        """
        eligible_merchants = self.merchant_db.get_subscription_merchants()
        if not eligible_merchants or user.subscriptions_count == 0:
            return []

        # Select unique subscription merchants for this user
        sub_count = min(user.subscriptions_count, len(eligible_merchants))
        user_subs = random.sample(eligible_merchants, sub_count)

        scheduled_transactions = []
        total_days = (end_date - start_date).days

        for merchant in user_subs:
            # Pick a recurring anchor day of month (1 to 28)
            anchor_day = random.randint(1, 28)

            # Determine frequency in days
            if merchant.subscription_frequency == "Annual":
                interval_days = 365
            elif merchant.subscription_frequency == "Quarterly":
                interval_days = 90
            else:  # Monthly default
                interval_days = 30

            # Generate recurring dates
            curr_date = start_date + timedelta(days=random.randint(0, 25))
            while curr_date <= end_date:
                # Clamp to anchor day
                try:
                    target_date = date(curr_date.year, curr_date.month, min(anchor_day, 28))
                except ValueError:
                    target_date = curr_date

                if start_date <= target_date <= end_date:
                    sub_time = f"{random.randint(6, 11):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}"

                    # Standard subscription amount
                    sub_amount = merchant.typical_min_amount if merchant.typical_min_amount == merchant.typical_max_amount else round(random.uniform(merchant.typical_min_amount, merchant.typical_max_amount), 2)

                    scheduled_transactions.append({
                        "user_id": user.user_id,
                        "date": target_date,
                        "time": sub_time,
                        "merchant": merchant.official_name,
                        "merchant_alias": merchant.get_random_alias(user.city),
                        "category": merchant.category,
                        "amount": sub_amount,
                        "is_subscription": 1,
                        "subscription_frequency": merchant.subscription_frequency or "Monthly",
                        "description": f"{merchant.official_name} - Recurring Subscription",
                        "payment_method": "Credit Card" if "Credit Card" in user.preferred_payment_methods else "UPI"
                    })

                curr_date += timedelta(days=interval_days)

        return scheduled_transactions
