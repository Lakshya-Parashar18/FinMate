import os
import sys
import random
import datetime
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Find and load the environment variables from the server/.env file
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
dotenv_path = os.path.join(project_root, "server", ".env")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

def get_db_client():
    """Establish a connection to the MongoDB database."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI not set in environment or server/.env")
    client = MongoClient(MONGO_URI)
    return client

def get_database(client):
    """Retrieve the database, falling back to 'test' if no default is specified in the URI."""
    try:
        return client.get_default_database()
    except Exception:
        return client.get_database("test")

def get_user_budget(db, user_id, year, month):
    """Retrieve the user's budget for the specified year and month."""
    try:
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        budget = db.budgets.find_one({"user": user_oid, "year": year, "month": month})
        if budget:
            return budget
    except Exception as e:
        print(f"Error fetching budget: {e}", file=sys.stderr)
    return None

def fetch_raw_transactions(user_id):
    """
    Fetch all transactions for a given user from the database.
    If the transaction history is too short (< 20 transactions), 
    we bootstrap realistic synthetic history so XGBoost can train.
    """
    client = get_db_client()
    db = get_database(client)
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Fetch all transactions from the db
    raw_txs = list(db.transactions.find({"user": user_oid}).sort("date", 1))
    
    # If the user has too few transactions, bootstrap synthetic records to allow XGBoost to learn
    if len(raw_txs) < 20:
        print(f"Bootstrapping synthetic transactions for user {user_id} (found {len(raw_txs)})", file=sys.stderr)
        raw_txs = bootstrap_synthetic_transactions(user_oid, raw_txs)
        
    client.close()
    return raw_txs

def bootstrap_synthetic_transactions(user_oid, existing_txs):
    """
    Generates realistic historical transactions for the last 6 months 
    based on any existing transactions or standard defaults.
    """
    categories = [
        "Food & Dining", "Rent & Housing", "Shopping", 
        "Utilities", "Transportation", "Entertainment", 
        "Healthcare", "Miscellaneous"
    ]
    
    # Calculate base spending rates from existing transactions if any
    base_category_amounts = {cat: [] for cat in categories}
    has_income = False
    
    for tx in existing_txs:
        cat = tx.get("category", "Miscellaneous")
        if cat not in base_category_amounts:
            base_category_amounts[cat] = []
        base_category_amounts[cat].append(abs(tx.get("amount", 100)))
        if tx.get("type") == "income":
            has_income = True
            
    # Default amounts if no history exists
    defaults = {
        "Food & Dining": 4000,
        "Rent & Housing": 15000,
        "Shopping": 3000,
        "Utilities": 2500,
        "Transportation": 2000,
        "Entertainment": 3000,
        "Healthcare": 1500,
        "Miscellaneous": 1000
    }
    
    mean_amounts = {}
    for cat in categories:
        amounts = base_category_amounts.get(cat, [])
        if amounts:
            mean_amounts[cat] = sum(amounts) / len(amounts)
        else:
            mean_amounts[cat] = defaults[cat]
            
    bootstrapped = []
    
    # Add existing ones first, normalising to offset-naive UTC datetimes
    for tx in existing_txs:
        copied = dict(tx)
        d = copied.get("date")
        if isinstance(d, datetime.datetime) and d.tzinfo is not None:
            copied["date"] = d.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        c = copied.get("createdAt")
        if isinstance(c, datetime.datetime) and c.tzinfo is not None:
            copied["createdAt"] = c.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        bootstrapped.append(copied)
        
    # Generate 6 months of historical transactions (offset-naive UTC)
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    for month_offset in range(1, 7):
        # Generate transactions for each month
        month_date = now - datetime.timedelta(days=30 * month_offset)
        
        # Monthly salary (income)
        income_amt = 50000 + random.randint(-5000, 10000)
        bootstrapped.append({
            "_id": ObjectId(),
            "user": user_oid,
            "date": month_date.replace(day=1, hour=10, minute=0, second=0),
            "description": "Monthly Salary Deposit",
            "category": "Salary",
            "amount": income_amt,
            "type": "income",
            "createdAt": month_date.replace(day=1)
        })
        
        # Rent
        rent_amt = mean_amounts["Rent & Housing"] * random.uniform(0.95, 1.05)
        bootstrapped.append({
            "_id": ObjectId(),
            "user": user_oid,
            "date": month_date.replace(day=5, hour=12, minute=0, second=0),
            "description": "Monthly Apartment Rent",
            "category": "Rent & Housing",
            "amount": -rent_amt,
            "type": "expense",
            "createdAt": month_date.replace(day=5)
        })
        
        # Various random daily/weekly expenses
        for day in range(1, 29):
            if random.random() > 0.4:  # 60% chance of transaction on any day
                cat = random.choice(categories[2:] + ["Food & Dining"])  # avoid rent
                if cat == "Food & Dining":
                    amt = random.uniform(150, 800)
                    desc = random.choice(["Swiggy", "Zomato", "Grocery Store", "Local Restaurant"])
                elif cat == "Shopping":
                    amt = random.uniform(500, 3000)
                    desc = random.choice(["Amazon Purchase", "Myntra Delivery", "Supermarket Mall"])
                elif cat == "Utilities":
                    # Utilities are monthly
                    if day != 10:
                        continue
                    amt = mean_amounts["Utilities"] * random.uniform(0.9, 1.1)
                    desc = random.choice(["Electricity Bill", "Internet Subscription", "Water Utility"])
                elif cat == "Transportation":
                    amt = random.uniform(100, 600)
                    desc = random.choice(["Uber Ride", "Ola Cab", "Metro Top-up", "Petrol Pump"])
                elif cat == "Entertainment":
                    amt = random.uniform(300, 2000)
                    desc = random.choice(["Netflix Sub", "Movie Ticket", "PVR Cinemas", "Starbucks Coffee"])
                elif cat == "Healthcare":
                    if random.random() > 0.2:
                        continue
                    amt = random.uniform(200, 1500)
                    desc = random.choice(["Pharmacy Store", "Doctor Consultation", "Medical Lab"])
                else:
                    amt = random.uniform(50, 500)
                    desc = "Miscellaneous Expense"
                    
                tx_date = month_date.replace(day=day, hour=random.randint(9, 21), minute=random.randint(0, 59))
                bootstrapped.append({
                    "_id": ObjectId(),
                    "user": user_oid,
                    "date": tx_date,
                    "description": desc,
                    "category": cat,
                    "amount": -amt,
                    "type": "expense",
                    "createdAt": tx_date
                })
                
    # Sort by date ascending
    bootstrapped.sort(key=lambda x: x["date"])
    return bootstrapped
