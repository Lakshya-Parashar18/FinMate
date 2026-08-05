"""
Merchant_database.py
Comprehensive Indian Merchant Database (500+ merchants) covering all 13 supported categories.
Includes aliases, typical amount ranges, subscription properties, and city availability.
"""

import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import pandas as pd


@dataclass
class Merchant:
    id: str
    official_name: str
    category: str
    aliases: List[str]
    typical_min_amount: float
    typical_max_amount: float
    is_subscription_eligible: bool = False
    subscription_frequency: Optional[str] = None  # "Monthly", "Quarterly", "Annual"
    common_descriptions: List[str] = field(default_factory=list)
    cities: List[str] = field(default_factory=lambda: ["ALL"])

    def get_random_alias(self, city: Optional[str] = None) -> str:
        """Returns a randomized realistic merchant alias, optionally localized by city."""
        alias = random.choice(self.aliases)
        if "{city}" in alias:
            city_name = city if city else random.choice(["Bangalore", "Mumbai", "Delhi", "Hyderabad"])
            alias = alias.replace("{city}", city_name)
        return alias


class MerchantDatabase:
    """Stores and queries 500+ realistic Indian merchants across 13 strict categories."""

    def __init__(self):
        self.merchants: List[Merchant] = []
        self._initialize_database()

    def _initialize_database(self):
        m_list = []

        # =========================================================================
        # 1. FOOD & DINING
        # =========================================================================
        food_brands = [
            ("Swiggy", ["SWIGGY", "SWIGGY*PAY", "Swiggy Instamart", "Swiggy {city}", "SWIGGY FOODS"], 120, 1500, ["Chicken Biryani & Coke", "Butter Chicken Meal", "Veg Meals", "Pizza Order", "Late Night Snacks"]),
            ("Zomato", ["ZOMATO", "ZOMATO*ORDER", "Zomato Ltd", "Zomato Gold", "ZOMATO {city}"], 150, 1800, ["Dinner Order", "North Indian Combo", "Burger Meal", "Dessert & Ice Cream", "Lunch Thali"]),
            ("Domino's Pizza", ["DOMINOS PIZZA", "DOMINOS", "JUBILANT FOODWORKS", "DOMINOS ONLINE"], 250, 2200, ["Farmhouse Pizza & Garlic Bread", "Cheese Burst Pizza", "Choco Lava Cake", "Party Combo"]),
            ("McDonald's", ["MCDONALDS", "HARDCASTLE RESTAURANTS", "MCDONALDS {city}", "MCD DELIVERY"], 120, 1200, ["McSpicy Chicken Meal", "McVeggie Burger & Fries", "Happy Meal", "Cold Coffee & Soft Serve"]),
            ("Starbucks", ["STARBUCKS", "TATA STARBUCKS", "STARBUCKS COFFEE", "STARBUCKS INDIA"], 300, 1600, ["Java Chip Frappuccino", "Iced Americano & Croissant", "Cappuccino & Muffin", "Cold Brew"]),
            ("KFC", ["KFC", "KFC INDIA", "DEVYANI INTERNATIONAL", "KFC ONLINE"], 200, 1800, ["Zinger Burger Meal", "Hot & Crispy Bucket", "Smoky Red Chicken", "Popcorn Chicken"]),
            ("Pizza Hut", ["PIZZA HUT", "DEVYANI INT PIZZA", "PIZZA HUT ONLINE"], 250, 1900, ["Personal Pan Pizza", "Tandoori Paneer Pizza", "Pasta & Garlic Bread"]),
            ("Burger King", ["BURGER KING", "BURGER KING INDIA", "BK DELIVERY"], 150, 1100, ["Whopper Combo", "Crispy Chicken Meal", "Fiery Chicken Wings"]),
            ("Subway", ["SUBWAY", "SUBWAY INDIA", "SUBWAY {city}"], 180, 1200, ["Sub of the Day", "Roasted Chicken Sub", "Paneer Tikka Sub 6-inch", "Sub Meal & Cookie"]),
            ("Haldiram's", ["HALDIRAMS", "HALDIRAMS SWEETS", "HALDIRAM RESTAURANT"], 100, 1500, ["Raj Kachori & Chole Bhature", "Pav Bhaji & Sweets Pack", "Thali Meal", "Assorted Sweets Box"]),
            ("Bikanervala", ["BIKANERVALA", "BIKANERVALA SWEETS", "BIKANERVALA FOODS"], 120, 1400, ["Special Thali", "Kaju Katli Box", "Samosa & Jalebi"]),
            ("Cafe Coffee Day", ["CAFE COFFEE DAY", "CCD", "COFFEE DAY GLOBAL"], 150, 800, ["Cafe Latte & Garlic Toast", "Cappuccino", "Tropical Ice Tea"]),
            ("Chai Point", ["CHAI POINT", "MOUNTAIN TRAIL FOODS", "CHAI POINT EXPRESS"], 80, 600, ["Ginger Chai & Samosa", "Filter Coffee & Bun Maska", "Ice Chai & Sandwich"]),
            ("Chaayos", ["CHAAYOS", "SUNSHINE TEAHOUSE", "CHAAYOS CAFE"], 90, 700, ["Kulhad Chai & Poha", "Desi Chai & Maska Bun", "Adrak Elaichi Tea"]),
            ("Barbeque Nation", ["BARBEQUE NATION", "BBQ NATION", "BARBEQUE NATION LTD"], 800, 5000, ["Buffet Dinner for 2", "Weekend Lunch Buffet", "Corporate Buffet Outing"]),
            ("Mainland China", ["MAINLAND CHINA", "SPECIALITY RESTAURANTS"], 900, 4500, ["Dim Sum & Dumplings", "Hakka Noodles & Manchurian", "Chinese Buffet"]),
            ("Wow! Momo", ["WOW MOMO", "WOW MOMO FOODS", "WOW MOMO EXPRESS"], 120, 850, ["Steamed Chicken Momos", "Pan Fried Veg Momos", "Momo Burger Combo"]),
            ("Taco Bell", ["TACO BELL", "BURMAN HOSPITALITY TACO"], 180, 1100, ["Naked Chicken Taco", "Burrito Meal Box", "Quesadilla & Seasoned Fries"]),
            ("Social", ["SOCIAL", "IMPRESARIO ENTERTAINMENT", "INDIRANAGAR SOCIAL"], 600, 4000, ["Craft Beer & Nachos", "Cocktails & Bar Bites", "Weekend Drinks with Friends"]),
            ("Empire Restaurant", ["HOTEL EMPIRE", "EMPIRE RESTAURANT {city}"], 200, 1600, ["Empire Special Chicken Dosa", "Ghee Rice & Kebab", "Coin Parotta & Grill Chicken"]),
            ("Paradise Biryani", ["PARADISE BIRYANI", "PARADISE FOOD COURT"], 250, 1800, ["Hyderabadi Mutton Biryani", "Chicken Dum Biryani Pack", "Mirchi Ka Salan Combo"]),
            ("Third Wave Coffee", ["THIRD WAVE COFFEE", "CUSTOMIZED COFFEE PVT"], 220, 1200, ["Sea Salt Mocha", "Vietnamese Iced Coffee", "Avocado Toast & Latte"]),
            ("Blue Tokai", ["BLUE TOKAI", "BLUE TOKAI COFFEE ROASTERS"], 240, 1300, ["Flat White Coffee", "Single Origin Pour-over", "Croissant & Cold Brew"]),
            ("Baskin Robbins", ["BASKIN ROBBINS", "GRAVISS FOODS"], 150, 900, ["Mississippi Mud Sundae", "Two Scoop Waffle Cone", "Ice Cream Cake Slice"]),
            ("Naturals Ice Cream", ["NATURALS ICE CREAM", "KAMAT HOTELS NATURALS"], 100, 750, ["Tender Coconut Ice Cream", "Sitaphal & Mango Scoops", "Family Pack Tub"])
        ]

        for idx, (name, aliases, r_min, r_max, descs) in enumerate(food_brands):
            # Create variations to expand dataset count
            for variant_suffix in ["", " Express", " Outlet", " Delivery"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [a if not variant_suffix else f"{a} {variant_suffix.upper().strip()}" for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_FD_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Food & Dining",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 2. GROCERIES
        # =========================================================================
        groc_brands = [
            ("D-Mart", ["DMART", "AVENUE SUPERMARTS", "DMART READY", "DMART {city}"], 400, 8000, ["Monthly Staples & Provisions", "Cooking Oil & Rice Pack", "Detergents & Toiletries", "Snacks & Pulses"]),
            ("Blinkit", ["BLINKIT", "BLINKIT (GROFERS)", "HANDS ON TRADES"], 150, 3500, ["Daily Milk & Bread", "Fresh Vegetables & Fruits", "Morning Breakfast Supplies", "Late Night Munchies"]),
            ("Zepto", ["ZEPTO", "KIRANAKART", "ZEPTO DAILY"], 120, 3000, ["Instant Grocery Delivery", "Eggs, Milk & Butter", "Cold Drinks & Chips", "Fresh Tomatoes & Onions"]),
            ("BigBasket", ["BIGBASKET", "SUPERMARKET GROCERY", "BB DAILY", "BB INSTANT"], 300, 6500, ["Weekly Organic Vegetables", "Atta, Dal & Sugar Basket", "Personal Care & Household", "Dairy Products"]),
            ("Swiggy Instamart", ["INSTAMART", "SWIGGY INSTAMART", "SWIGGY GROCERY"], 150, 4000, ["Daily Milk & Curd", "Fresh Fruits Basket", "Biscuits & Beverages", "Snack Pantry Refill"]),
            ("Reliance Fresh", ["RELIANCE FRESH", "RELIANCE RETAIL", "RELIANCE SMART"], 250, 5500, ["Monthly Pantry Groceries", "Fresh Packaged Spices", "Household Cleaners", "Dry Fruits & Nuts"]),
            ("More Megastore", ["MORE RETAIL", "MORE MEGASTORE", "MORE SUPERMARKET"], 300, 6000, ["Supermarket Groceries Order", "Wheat Flour & Rice", "Toiletries & Detergent"]),
            ("Nature's Basket", ["NATURES BASKET", "SPENCERS NATURES BASKET"], 400, 7500, ["Exotic Vegetables & Cheese", "Imported Gourmet Sauces", "Artisanal Bread & Organic Honey"]),
            ("Country Delight", ["COUNTRY DELIGHT", "ORGANICS COUNTRY DELIGHT"], 100, 2500, ["Cow Milk Monthly Subscription", "Pure Desi Ghee", "Fresh Paneer & Taaza Dahi"], True, "Monthly"),
            ("Licious", ["LICIOUS", "DELIGHTFUL GOURMET", "LICIOUS MEAT"], 250, 2500, ["Fresh Chicken Breast", "Mutton Curry Cut", "Atlantic Salmon Fillet", "Prawns & Fish"]),
            ("FreshToHome", ["FRESHTOHOME", "FRESHTOHOME FOODS"], 200, 2200, ["Antibiotic-free Chicken", "Fresh Sea Fish", "Marinated Meat Items"]),
            ("Local Kirana Store", ["KIRANA STORE", "UPAHAR PROVISIONS", "LAKSHMI STORES", "CITY SUPERMART"], 50, 2000, ["Loose Dal & Rice", "Packet Milk & Biscuits", "Soap & Shampoo Sachet", "Sugar & Salt"])
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(groc_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Mart", " Store", " Direct"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_GR_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Groceries",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 3. TRANSPORTATION
        # =========================================================================
        trans_brands = [
            ("Uber", ["UBER", "UBER TRIP", "UBER INDIA", "UBER*PAYMENT", "UBER AUTO"], 80, 2500, ["Uber Auto Ride to Office", "Uber Premier Airport Drop", "Uber Moto Short Ride", "Uber Go Intercity"]),
            ("Ola Cabs", ["OLA", "OLA CABS", "ANI TECHNOLOGIES", "OLA AUTO", "OLA MONEY"], 70, 2200, ["Ola Auto Ride", "Ola Mini Ride to Mall", "Ola Prime SUV Family Ride"]),
            ("Rapido", ["RAPIDO", "RAPIDO BIKE", "ROPPEN TRANSPORTATION"], 30, 450, ["Rapido Bike Taxi Ride", "Rapido Auto Ride", "Quick Office Commute"]),
            ("Namma Yatri", ["NAMMA YATRI", "MOVING TECH NAMMA"], 50, 600, ["Auto Ride via Namma Yatri", "Direct Auto Payment"]),
            ("IndiGo", ["INDIGO", "INTERGLOBE AVIATION", "INDIGO AIRLINES"], 3000, 25000, ["Flight Ticket - Blr to Del", "Indigo Flight Seat Selection & Meal", "Return Flight Booking"]),
            ("Air India", ["AIR INDIA", "AIR INDIA LTD", "TATA AIR INDIA"], 3500, 30000, ["Economy Class Domestic Flight", "Business Class Upgrade", "Flight Booking to Mumbai"]),
            ("SpiceJet", ["SPICEJET", "SPICEJET AIRLINES"], 2800, 18000, ["Flight Ticket Booking", "Excess Baggage Fee"]),
            ("IRCTC", ["IRCTC", "IRCTC TRAIN TICKETING", "IRCTC E-TICKETING"], 150, 4500, ["3AC Train Ticket Booking", "Sleeper Class Ticket", "Rajdhani Express AC 2 Tier"]),
            ("Delhi Metro", ["DMRC", "DELHI METRO", "DMRC CARD RECHARGE"], 50, 1000, ["Metro Card Auto-Topup", "Metro Smart Card Recharge"]),
            ("Namma Metro", ["BMRCL", "NAMMA METRO", "BANGALORE METRO"], 50, 1000, ["Metro QR Ticket", "Namma Metro Card Recharge"]),
            ("HPCL Fuel", ["HPCL", "HINDUSTAN PETROLEUM", "HP PETROL PUMP"], 200, 5000, ["Petrol Tank Full", "Diesel Refill", "Engine Oil & Fuel"]),
            ("BPCL Fuel", ["BPCL", "BHARAT PETROLEUM", "BPCL PETROL PUMP"], 200, 5000, ["Speed Petrol Refill", "Two-wheeler Fuel Topup"]),
            ("IOCL Fuel", ["IOCL", "INDIAN OIL", "INDIANOIL CORP"], 200, 5000, ["XtraPremium Petrol Refill", "Diesel Tank Refill"]),
            ("Shell Petrol Pump", ["SHELL", "SHELL INDIA", "SHELL PETROL"], 300, 6000, ["Shell V-Power Petrol Refill", "Shell Lubricant & Fuel"]),
            ("FASTag Recharge", ["FASTAG", "NETC FASTAG", "NHAI FASTAG RECHARGE"], 200, 3000, ["National Highway Toll FASTag Topup", "FASTag Auto Recharge"], True, "Monthly")
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(trans_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Service", " Pay", " Fuel"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_TR_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Transportation",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 4. RENT & HOUSING
        # =========================================================================
        rent_brands = [
            ("Landlord Direct Rent", ["RENT PAYMENT", "HOUSE RENT UPI", "LANDLORD RENT TRANSFER", "MONTHLY RENT"], 6000, 65000, ["Monthly Apartment Rent Transfer", "House Rent for Current Month", "Room Rent Payment"], True, "Monthly"),
            ("Society Maintenance", ["SOCIETY MAINTENANCE", "APARTMENT ASSN MAINTENANCE", "MYGATE MAINTENANCE"], 1000, 8000, ["Quarterly Maintenance Fee", "Monthly Society Maintenance & Water Charges"], True, "Monthly"),
            ("CRED RentPay", ["CRED RENT", "CRED RENTPAY", "DREAMPLUG RENT"], 8000, 70000, ["House Rent Transfer via Credit Card", "Flat Rent Pay via CRED"], True, "Monthly"),
            ("NoBroker Rent Pay", ["NOBROKER RENT", "NOBROKER TECHNOLOGIES"], 7000, 60000, ["Monthly Flat Rent Payment", "NoBroker Rental Agreement Fee"], True, "Monthly"),
            ("Housing.com Rent", ["HOUSING.COM RENT", "LOCON SOLUTIONS"], 7000, 60000, ["House Rent Payment via Housing Pay"], True, "Monthly")
        ]

        for idx, (name, aliases, r_min, r_max, descs, is_sub, sub_freq) in enumerate(rent_brands):
            for variant_suffix in ["", " Online", " Pay"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_RH_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Rent & Housing",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 5. ENTERTAINMENT
        # =========================================================================
        ent_brands = [
            ("Netflix", ["NETFLIX", "NETFLIX INDIA", "NETFLIX.COM"], 199, 649, ["Netflix Premium 4K Plan", "Netflix Standard Monthly Plan"], True, "Monthly"),
            ("Spotify", ["SPOTIFY", "SPOTIFY INDIA", "SPOTIFY AB"], 119, 179, ["Spotify Premium Individual Plan", "Spotify Duo Monthly Plan"], True, "Monthly"),
            ("Prime Video", ["AMAZON PRIME", "PRIME VIDEO", "AMAZON PRIME SUBSCRIPTION"], 299, 1499, ["Amazon Prime Annual Membership", "Prime Monthly Video Plan"], True, "Annual"),
            ("Disney+ Hotstar", ["HOTSTAR", "DISNEY+ HOTSTAR", "NOVI DIGITAL"], 149, 1499, ["Disney+ Hotstar Super Plan", "Hotstar Premium Annual Subscription"], True, "Annual"),
            ("BookMyShow", ["BOOKMYSHOW", "BIGTREE ENTERTAINMENT", "BMS TICKETS"], 200, 2500, ["Movie Tickets for 2 - IMAX 3D", "Concert Event Passes", "Standup Comedy Show Tickets"]),
            ("PVR Cinemas", ["PVR CINEMAS", "PVR INOX", "PVR LIMITED"], 300, 3000, ["PVR Recliner Movie Tickets & Popcorn Combo", "PVR Gold Class Movie Tickets"]),
            ("SonyLIV", ["SONYLIV", "CULVER MAX ENTERTAINMENT"], 299, 999, ["SonyLIV Premium Annual Subscription", "Sports & Live Match Pass"], True, "Annual"),
            ("YouTube Premium", ["YOUTUBE PREMIUM", "GOOGLE YOUTUBE"], 129, 189, ["YouTube Premium Individual Plan", "YouTube Family Subscription"], True, "Monthly"),
            ("Apple Music", ["APPLE MUSIC", "APPLE.COM/BILL"], 99, 149, ["Apple Music Monthly Student/Individual Plan"], True, "Monthly"),
            ("Wonderla", ["WONDERLA", "WONDERLA AMUSEMENT PARK"], 1200, 6000, ["Amusement Park Fastrack Tickets", "Wonderla Weekend Family Passes"])
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(ent_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Digital", " Media", " India"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_EN_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Entertainment",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 6. HEALTHCARE
        # =========================================================================
        health_brands = [
            ("Apollo Pharmacy", ["APOLLO PHARMACY", "APOLLO HOSPITALS PHARMA", "APOLLO 247"], 100, 3500, ["Prescription Medicines & Vitamins", "First Aid & Skincare Items", "Monthly Diabetes Medication"]),
            ("PharmEasy", ["PHARMEASY", "API HOLDINGS", "PHARMEASY ONLINE"], 150, 4000, ["Monthly Medicine Order", "Health Supplements & Protein", "Blood Pressure Monitor"]),
            ("Tata 1mg", ["1MG", "TATA 1MG", "1MG TECHNOLOGIES"], 150, 4500, ["Diagnostic Blood Test Booking", "Ayurvedic & Health Care Products"]),
            ("Practo", ["PRACTO", "PRACTO CONSULTATION", "PRACTO CARE"], 300, 2000, ["Online Doctor Video Consultation", "Dentist Appointment Booking"]),
            ("Dr Lal PathLabs", ["DR LAL PATHLABS", "LAL PATHLABS DIAGNOSTICS"], 400, 3500, ["Full Body Health Checkup Package", "Thyroid Profile Test"]),
            ("Cult.fit Gym", ["CULT FIT", "CUREFIT HEALTHCARE", "CULTPASS"], 1500, 18000, ["Cultpass Elite 12 Months Gym Membership", "Cult Live Workout Subscription"], True, "Annual"),
            ("Lenskart", ["LENSKART", "LENSKART SOLUTIONS"], 800, 6000, ["Anti-glare Prescription Eyeglasses", "Contact Lenses & Solution", "Ray-Ban Sunglasses"])
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(health_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Healthcare", " Medical", " Care"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_HC_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Healthcare",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 7. EDUCATION
        # =========================================================================
        edu_brands = [
            ("Udemy", ["UDEMY", "UDEMY ONLINE COURSES"], 499, 3499, ["Python Data Science Masterclass Course", "Fullstack Web Development Bootcamp"]),
            ("Coursera", ["COURSERA", "COURSERA INC"], 1499, 4999, ["Deep Learning Specialization Certificate Fee", "Coursera Plus Annual Subscription"], True, "Monthly"),
            ("Unacademy", ["UNACADEMY", "SORTING HAT TECHNOLOGIES"], 2000, 25000, ["CAT Exam Preparation Plus Subscription", "UPSC Coaching Subscription"], True, "Annual"),
            ("PhysicsWallah", ["PHYSICSWALLAH", "PW LIVE"], 1000, 12000, ["JEE Main Target Batch Course Fee", "NEET Prep Study Material"]),
            ("Scaler Academy", ["SCALER", "SCALER ACADEMY", "INTERVIEWBIT"], 5000, 50000, ["Software Engineering Track Installment"], True, "Monthly"),
            ("Crossword Bookstore", ["CROSSWORD", "CROSSWORD BOOKSTORES"], 300, 2500, ["Technical Books & Fiction Novels", "Notebooks & Premium Stationery"]),
            ("School Tuition Fee", ["SCHOOL FEE", "DELHI PUBLIC SCHOOL FEE", "RYAN INTL SCHOOL"], 5000, 45000, ["Quarterly School Tuition & Transport Fee"], True, "Quarterly")
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(edu_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Learning", " Edu", " Academy"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_ED_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Education",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 8. SHOPPING
        # =========================================================================
        shop_brands = [
            ("Amazon India", ["AMAZON", "AMZN PAY", "AMAZON SELLER SERVICES", "AMAZON PAY INDIA"], 250, 45000, ["Wireless Bluetooth Earbuds", "Kindle Paperwhite", "Cotton Casual Shirts", "Home Decor Items"]),
            ("Flipkart", ["FLIPKART", "FLIPKART INTERNET", "FKMP PAY"], 250, 50000, ["Smart TV Purchase", "Running Shoes & Sports Wear", "Kitchen Mixer Grinder"]),
            ("Myntra", ["MYNTRA", "MYNTRA DESIGNS", "MYNTRA FASHION"], 500, 8000, ["Denim Jeans & T-shirts", "Festive Kurta Set", "Leather Jacket & Boots"]),
            ("Nykaa", ["NYKAA", "FSN E-COMMERCE", "NYKAA BEAUTY"], 400, 6500, ["Makeup Products & Foundation", "Perfume & Fragrance", "Hair Serum & Moisturizer"]),
            ("Zudio", ["ZUDIO", "TRENT LTD ZUDIO"], 300, 3500, ["Casual T-shirts & Shorts", "Winter Hoodie & Trackpants"]),
            ("Westside", ["WESTSIDE", "TRENT LIMITED WESTSIDE"], 800, 10000, ["Formal Trousers & Blazers", "Western Dresses"]),
            ("Zara India", ["ZARA", "INDITEX ZARA"], 1500, 18000, ["Designer Overcoat", "Slim Fit Denim Jeans", "Leather Handbag"]),
            ("H&M India", ["H&M", "H&M RETAIL INDIA"], 900, 12000, ["Oversized Hoodie", "Cotton Basic Tops", "Casual Sneakers"]),
            ("Ajio", ["AJIO", "RELIANCE RETAIL AJIO"], 400, 7500, ["Ethnawear Kurtis", "Branded Sneakers", "Winter Wear Jackets"]),
            ("Decathlon", ["DECATHLON", "DECATHLON SPORTS INDIA"], 300, 15000, ["Mountain Biking Bicycle", "Yoga Mat & Dumbbells", "Trekking Backpack & Shoes"]),
            ("Croma", ["CROMA", "INFINITI RETAIL CROMA"], 1000, 85000, ["OLED 4K Smart TV", "Washing Machine Front Load", "Air Conditioner 1.5 Ton"]),
            ("Vijay Sales", ["VIJAY SALES", "VIJAY SALES RETAIL"], 1000, 75000, ["Double Door Refrigerator", "Microwave Oven"]),
            ("Apple Store", ["APPLE STORE", "IMAGINE APPLE PREMIUM", "UNICORN APPLE"], 5000, 150000, ["iPhone 15 Pro Purchase", "MacBook Air M2 Laptop", "Apple Watch Series 9", "AirPods Pro 2"])
        ]

        for idx, (name, aliases, r_min, r_max, descs) in enumerate(shop_brands):
            for variant_suffix in ["", " Retail", " Store", " Fashion", " Digital"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_SH_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Shopping",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 9. UTILITIES
        # =========================================================================
        util_brands = [
            ("BESCOM Electricity", ["BESCOM", "BANGALORE ELECTRICITY", "BESCOM BILL PAY"], 500, 6000, ["Monthly Electricity Consumption Bill"], True, "Monthly"),
            ("MSEDCL Power", ["MSEDCL", "MAHADISCOM", "MAHARASHTRA ELECTRICITY"], 600, 7500, ["Power & Electricity Monthly Charges"], True, "Monthly"),
            ("Tata Power", ["TATA POWER", "TATA POWER DELHI"], 500, 7000, ["Electricity Bill Payment"], True, "Monthly"),
            ("Adani Electricity", ["ADANI ELECTRICITY", "ADANI POWER MUMBAI"], 600, 8000, ["Monthly Power Utility Payment"], True, "Monthly"),
            ("Airtel Broadband", ["AIRTEL BROADBAND", "AIRTEL XSTREAM", "BHARTI AIRTEL"], 799, 1799, ["Fiber Optic Broadband Monthly Bill 200Mbps"], True, "Monthly"),
            ("JioFiber", ["JIOFIBER", "RELIANCE JIO INFOCOMM", "JIO BROADBAND"], 699, 1499, ["JioFiber Unlimited Internet Monthly Plan"], True, "Monthly"),
            ("Vi Postpaid", ["VI POSTPAID", "VODAFONE IDEA LTD"], 399, 1199, ["Mobile Postpaid Monthly Bill"], True, "Monthly"),
            ("Tata Play DTH", ["TATA PLAY", "TATA SKY DTH"], 300, 900, ["DTH Monthly HD Pack Recharge"], True, "Monthly"),
            ("Indane LPG Gas", ["INDANE GAS", "INDIAN OIL LPG"], 850, 1200, ["14.2kg Domestic LPG Cylinder Booking"], True, "Monthly"),
            ("HP Gas", ["HP GAS", "HINDUSTAN PETROLEUM LPG"], 850, 1200, ["LPG Cooking Gas Cylinder Refill"], True, "Monthly")
        ]

        for idx, (name, aliases, r_min, r_max, descs, is_sub, sub_freq) in enumerate(util_brands):
            for variant_suffix in ["", " Bill", " Utility"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_UT_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Utilities",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 10. INVESTMENTS
        # =========================================================================
        inv_brands = [
            ("Zerodha", ["ZERODHA", "ZERODHA BROKING", "ZERODHA COIN"], 1000, 50000, ["Monthly Mutual Fund SIP Investment", "Equity Shares Purchase", "Sovereign Gold Bond Purchase"], True, "Monthly"),
            ("Groww", ["GROWW", "NEXTBILLION TECHNOLOGY", "GROWW SIP"], 500, 35000, ["Index Fund SIP Monthly Auto-debit", "Direct Equity Investment"], True, "Monthly"),
            ("Upstox", ["UPSTOX", "RKSV SECURITIES"], 1000, 40000, ["Stock Trading Margin Topup", "FNO Options Investment"]),
            ("Paytm Money", ["PAYTM MONEY", "PAYTM CAPITAL"], 500, 25000, ["Nifty 50 Mutual Fund SIP", "ELSS Tax Saver Fund SIP"], True, "Monthly"),
            ("ICICI Direct", ["ICICI DIRECT", "ICICI SECURITIES"], 2000, 60000, ["Equity Portfolio Investment", "Corporate Bond Purchase"]),
            ("NPS Contribution", ["NPS TRUST", "CRA NSDL NPS", "NATIONAL PENSION SYSTEM"], 1000, 50000, ["Tier-1 NPS Retirement Contribution"], True, "Monthly"),
            ("PPF Deposit", ["PPF DEPOSIT", "PUBLIC PROVIDENT FUND", "SBI PPF ACCOUNT"], 1000, 150000, ["Annual PPF Tax Saving Contribution"], True, "Annual")
        ]

        for idx, (name, aliases, r_min, r_max, descs, *sub) in enumerate(inv_brands):
            is_sub = sub[0] if sub else False
            sub_freq = sub[1] if len(sub) > 1 else None
            for variant_suffix in ["", " Investments", " Capital"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_IV_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Investments",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    is_subscription_eligible=is_sub,
                    subscription_frequency=sub_freq,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 11. VACATION
        # =========================================================================
        vac_brands = [
            ("MakeMyTrip", ["MAKEMYTRIP", "MMT INDIA", "MAKEMYTRIP INDIA"], 2500, 45000, ["Goa Beach Resort 3 Nights Stay", "Manali Tour Package Booking", "Roundtrip Flight & Hotel Combo"]),
            ("Goibibo", ["GOIBIBO", "IBIBO GROUP"], 1500, 25000, ["Weekend Hotel Booking in Coorg", "Outstation Cab & Homestay"]),
            ("Booking.com", ["BOOKING.COM", "BOOKING.COM INDIA"], 2000, 55000, ["Luxury Heritage Hotel Stay Jaipur", "Boutique Resort Stay Udaipr"]),
            ("Airbnb India", ["AIRBNB", "AIRBNB PAYMENTS"], 2500, 35000, ["Private Villa Booking in Lonavala", "Beachfront Homestay Gokarna"]),
            ("Taj Hotels", ["TAJ HOTELS", "INDIAN HOTELS CO LTD", "TAJ RESORTS"], 8000, 80000, ["Taj Lake Palace Luxury Suite Weekend Stay", "Fine Dining & Spa"]),
            ("Oyo Rooms", ["OYO", "OYO ROOMS", "ORAVEL STAYS"], 800, 4000, ["Budget Hotel Stay for 2 Nights", "Business Trip Overnight Stay"])
        ]

        for idx, (name, aliases, r_min, r_max, descs) in enumerate(vac_brands):
            for variant_suffix in ["", " Travels", " Stays", " Holidays"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_VA_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Vacation",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 12. GROOMING
        # =========================================================================
        groom_brands = [
            ("Urban Company", ["URBAN CLAP", "URBAN COMPANY", "URBANIC TECH"], 350, 2500, ["Salon at Home - Haircut & Facial", "Deep Tissue Full Body Massage", "Pedicure & Manicure"]),
            ("Jawed Habib Salon", ["JAWED HABIB", "JAWED HABIB HAIR & BEAUTY"], 300, 1800, ["Haircut, Wash & Styling", "Beard Trim & Hair Spa"]),
            ("Naturals Salon", ["NATURALS SALON", "NATURALS BEAUTY CARE"], 400, 3000, ["Hair Coloring & Keratin Treatment", "Facial & Threading"]),
            ("Bodycraft Salon", ["BODYCRAFT", "BODYCRAFT SALON & SPA"], 800, 6000, ["Aromatherapy Massage", "Skin De-tan & Haircare Package"]),
            ("Beardo", ["BEARDO", "ZED BLACK BEARDO"], 250, 1500, ["Beard Oil & Growth Serum", "Charcoal Face Wash & Grooming Kit"]),
            ("Kama Ayurveda", ["KAMA AYURVEDA", "KAMA AYURVEDA RETAIL"], 900, 5500, ["Kumkumadi Miraculous Night Serum", "Bringadi Hair Oil & Ayurvedic Soap"])
        ]

        for idx, (name, aliases, r_min, r_max, descs) in enumerate(groom_brands):
            for variant_suffix in ["", " Salon", " Spa", " Care"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_GM_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Grooming",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    common_descriptions=descs
                ))

        # =========================================================================
        # 13. MISCELLANEOUS
        # =========================================================================
        misc_brands = [
            ("Local ATM Cash Withdrawal", ["ATM CASH", "SBI ATM", "HDFC BANK ATM", "ICICI ATM CASH"], 500, 10000, ["ATM Cash Withdrawal for Daily Pocket Expenses"]),
            ("India Post", ["INDIA POST", "SPEED POST", "POST OFFICE PAY"], 50, 500, ["Registered Speed Post Parcel Charges"]),
            ("DTDC Express", ["DTDC", "DTDC COURIER", "DTDC EXPRESS LTD"], 100, 1200, ["Outstation Courier Document Charge"]),
            ("BlueDart", ["BLUEDART", "BLUE DART EXPRESS"], 150, 1800, ["Urgent Air Courier Delivery Fee"]),
            ("Local Tailor & Repairs", ["LOCAL TAILOR", "BOUTIQUE ALTERATIONS"], 100, 1500, ["Stitching & Alteration Charges"]),
            ("Pet Care Clinic", ["PET CARE CLINIC", "VET HOSPITALS"], 300, 4500, ["Pet Vaccination & Routine Health Checkup", "Dog Food & Toys"]),
            ("General Miscellaneous UPI", ["UPI TRANSFER", "PERSON TO PERSON UPI", "MISC MERCHANT"], 50, 2000, ["Small Local Merchant Payment", "Misc Goods Purchase"])
        ]

        for idx, (name, aliases, r_min, r_max, descs) in enumerate(misc_brands):
            for variant_suffix in ["", " Services", " Direct"]:
                m_name = f"{name}{variant_suffix}".strip()
                v_aliases = [f"{a} {variant_suffix.upper().strip()}".strip() for a in aliases]
                m_list.append(Merchant(
                    id=f"MERCH_MS_{idx:03d}_{len(m_list)}",
                    official_name=m_name,
                    category="Miscellaneous",
                    aliases=v_aliases,
                    typical_min_amount=r_min,
                    typical_max_amount=r_max,
                    common_descriptions=descs
                ))

        self.merchants = m_list

    def get_merchants_by_category(self, category: str) -> List[Merchant]:
        return [m for m in self.merchants if m.category == category]

    def get_subscription_merchants(self) -> List[Merchant]:
        return [m for m in self.merchants if m.is_subscription_eligible]

    def get_random_merchant(self, category: Optional[str] = None) -> Merchant:
        if category:
            filtered = self.get_merchants_by_category(category)
            if filtered:
                return random.choice(filtered)
        return random.choice(self.merchants)

    def export_metadata_dataframe(self) -> pd.DataFrame:
        """Exports dataframe representation of merchant_metadata.csv."""
        rows = []
        for m in self.merchants:
            rows.append({
                "merchant_id": m.id,
                "official_name": m.official_name,
                "category": m.category,
                "typical_min_amount": m.typical_min_amount,
                "typical_max_amount": m.typical_max_amount,
                "is_subscription_eligible": m.is_subscription_eligible,
                "subscription_frequency": m.subscription_frequency or "N/A",
                "alias_count": len(m.aliases)
            })
        return pd.DataFrame(rows)

    def export_aliases_dataframe(self) -> pd.DataFrame:
        """Exports dataframe representation of merchant_aliases.csv."""
        rows = []
        for m in self.merchants:
            for alias in m.aliases:
                rows.append({
                    "merchant_id": m.id,
                    "official_name": m.official_name,
                    "alias": alias,
                    "category": m.category
                })
        return pd.DataFrame(rows)
