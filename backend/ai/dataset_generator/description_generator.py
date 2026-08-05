"""
Description_generator.py
Generates realistic transaction descriptions and notes matching merchants, categories, and amounts.
"""

import random
from typing import Optional
from merchant_database import Merchant


class DescriptionGenerator:
    """Generates realistic transaction item descriptions and notes."""

    GENERIC_DESCRIPTIONS = {
        "Food & Dining": [
            "Chicken Biryani & Soft Drink", "Paneer Butter Masala & Roti", "Lunch Combo Meal",
            "Weekend Family Dinner", "Morning Coffee & Maska Bun", "Pizza & Garlic Bread",
            "South Indian Meals", "Snacks & Cold Drinks", "Team Lunch", "Evening Tea & Samosa"
        ],
        "Groceries": [
            "Weekly Staples & Vegetables", "Milk, Bread & Taaza Dahi", "Atta, Dal & Cooking Oil",
            "Snacks, Biscuits & Household Cleaners", "Fresh Fruits Basket", "Breakfast Cereals & Eggs"
        ],
        "Transportation": [
            "Uber Auto Ride to Office", "Ola Ride Home", "Petrol Tank Refill", "Diesel Fuel Topup",
            "Metro Smartcard Topup", "Highway FASTag Auto Toll", "Rapido Bike Commute", "Airport Cab Transfer"
        ],
        "Rent & Housing": [
            "Monthly Apartment Rent Payment", "House Owner Direct Rent Transfer", "Monthly Society Maintenance & Water"
        ],
        "Entertainment": [
            "PVR Recliner Movie Tickets", "IMAX 3D Movie Show", "Spotify Premium Monthly Subscription",
            "Netflix 4K Monthly Membership", "Standup Comedy Show Tickets", "Weekend Gaming Arcade Pass"
        ],
        "Healthcare": [
            "Prescription Medicines & Vitamins", "Monthly BP & Diabetes Medication", "Full Body Blood Test Diagnostic Package",
            "Dentist Consultation & Cleaning", "Eyeglasses Prescription Lens", "First Aid & Skincare Items"
        ],
        "Education": [
            "Python & Data Science Course Fee", "Quarterly School Tuition Fee", "Technical Textbooks & Notebooks",
            "Certification Exam Registration Fee", "Online Course Subscription"
        ],
        "Shopping": [
            "Cotton Casual Shirt & Jeans", "Branded Running Sneakers", "Wireless Bluetooth Earbuds",
            "Smartwatch & Accessories", "Festive Kurta Set", "Home Decor & Cushion Covers"
        ],
        "Utilities": [
            "Monthly BESCOM Electricity Consumption Bill", "Airtel Xstream Fiber Broadband Bill",
            "14.2kg LPG Gas Cooking Cylinder Refill", "Mobile Postpaid Monthly Bill", "Tata Play DTH Pack Recharge"
        ],
        "Investments": [
            "Monthly Mutual Fund SIP Investment", "Direct Equity Shares Purchase", "Nifty 50 Index Fund Auto-SIP",
            "Sovereign Gold Bond Deposit", "NPS Tier-1 Pension Contribution"
        ],
        "Vacation": [
            "Goa Beach Resort 3 Nights Booking", "Outstation Taxi & Homestay", "Domestic Flight Ticket Booking",
            "Weekend Resort Package Coorg"
        ],
        "Grooming": [
            "Haircut, Wash & Styling", "Beard Trim & Facial", "Full Body Aromatherapy Massage",
            "Beard Oil & Face Wash Kit"
        ],
        "Miscellaneous": [
            "ATM Pocket Cash Withdrawal", "Outstation Speed Post Courier Charge", "Tailor Alteration Charges",
            "Pet Vaccination & Vet Consultation", "Misc Small Store Payment"
        ]
    }

    @staticmethod
    def generate_description(merchant: Merchant, category: str, is_subscription: bool = False) -> str:
        """Generates a realistic transaction item description."""
        if is_subscription and merchant.is_subscription_eligible:
            freq = merchant.subscription_frequency or "Monthly"
            return f"{merchant.official_name} - {freq} Subscription Membership"

        if merchant.common_descriptions:
            return random.choice(merchant.common_descriptions)

        # Fallback to category defaults
        category_descs = DescriptionGenerator.GENERIC_DESCRIPTIONS.get(category, ["General Payment"])
        return random.choice(category_descs)

    @staticmethod
    def generate_notes(
        merchant: Merchant,
        category: str,
        amount: float,
        is_anomaly: bool = False,
        is_subscription: bool = False
    ) -> str:
        """Generates realistic human notes for a transaction."""
        if is_anomaly:
            return f"ANOMALY DETECTED: High value charge of ₹{amount:,.2f} at {merchant.official_name}"

        if is_subscription:
            return f"Auto-debit recurring subscription for {merchant.official_name}"

        notes_pool = [
            f"Paid via UPI at {merchant.official_name}",
            f"Personal expense for {category.lower()}",
            f"Regular purchase at {merchant.official_name}",
            f"Verified transaction",
            ""  # Many transactions have no notes
        ]

        return random.choice(notes_pool)
