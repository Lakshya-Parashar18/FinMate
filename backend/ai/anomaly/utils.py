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

def fetch_raw_transactions(user_id):
    """
    Fetch all transactions for a given user from the database.
    If the transaction history is too short (< 20 transactions),
    we bootstrap realistic synthetic history containing normal spending 
    and a few outliers, allowing Isolation Forest to train a clean boundary.
    """
    client = get_db_client()
    db = get_database(client)
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Fetch all transactions from the db
    raw_txs = list(db.transactions.find({"user": user_oid}).sort("date", 1))
    
    # If the user has too few transactions, bootstrap synthetic records
    if len(raw_txs) < 20:
        print(f"Bootstrapping synthetic transactions for user {user_id} (found {len(raw_txs)})", file=sys.stderr)
        raw_txs = bootstrap_synthetic_transactions(user_oid, raw_txs)
        
    client.close()
    return raw_txs

def get_user_budgets(user_id):
    """Retrieves all budgets for this user to help compute utilization."""
    client = get_db_client()
    db = get_database(client)
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    budgets = list(db.budgets.find({"user": user_oid}))
    client.close()
    return budgets

def bootstrap_synthetic_transactions(user_oid, existing_txs):
    """
    Generates realistic historical transactions for the last 6 months
    including standard normal transactions and a few seeded outliers.
    """
    categories = [
        "Food & Dining", "Rent & Housing", "Shopping", 
        "Utilities", "Transportation", "Entertainment", 
        "Healthcare", "Miscellaneous"
    ]
    
    bootstrapped = []
    
    # Add existing ones first, normalising to naive UTC
    for tx in existing_txs:
        copied = dict(tx)
        d = copied.get("date")
        if isinstance(d, datetime.datetime) and d.tzinfo is not None:
            copied["date"] = d.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        c = copied.get("createdAt")
        if isinstance(c, datetime.datetime) and c.tzinfo is not None:
            copied["createdAt"] = c.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        bootstrapped.append(copied)
        
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    
    # Generate 6 months of historical transactions (approx 120 normal daily transactions)
    for month_offset in range(1, 7):
        month_date = now - datetime.timedelta(days=30 * month_offset)
        
        # Monthly salary (income)
        income_amt = 50000 + random.randint(-2000, 5000)
        tx_date = month_date.replace(day=1, hour=10, minute=0, second=0)
        bootstrapped.append({
            "_id": ObjectId(),
            "user": user_oid,
            "date": tx_date,
            "description": "Monthly Salary Deposit",
            "category": "Salary",
            "amount": income_amt,
            "type": "income",
            "createdAt": tx_date
        })
        
        # Rent
        rent_amt = 15000 + random.randint(-500, 500)
        tx_date = month_date.replace(day=5, hour=12, minute=0, second=0)
        bootstrapped.append({
            "_id": ObjectId(),
            "user": user_oid,
            "date": tx_date,
            "description": "Monthly Apartment Rent",
            "category": "Rent & Housing",
            "amount": -rent_amt,
            "type": "expense",
            "createdAt": tx_date
        })
        
        # Standard daily transactions (60% probability per day)
        for day in range(1, 29):
            if random.random() > 0.4:
                cat = random.choice(categories[2:] + ["Food & Dining"])
                if cat == "Food & Dining":
                    amt = random.uniform(100, 600)
                    desc = random.choice(["Swiggy", "Zomato", "Grocery Store", "Local Cafe"])
                elif cat == "Shopping":
                    amt = random.uniform(300, 2000)
                    desc = random.choice(["Amazon", "Flipkart", "Zara"])
                elif cat == "Utilities":
                    if day != 10:
                        continue
                    amt = random.uniform(1500, 3000)
                    desc = "Electricity Bill"
                elif cat == "Transportation":
                    amt = random.uniform(100, 500)
                    desc = random.choice(["Uber", "Ola", "Metro card"])
                elif cat == "Entertainment":
                    amt = random.uniform(200, 1500)
                    desc = random.choice(["Netflix", "PVR Cinemas", "Coffee Day"])
                elif cat == "Healthcare":
                    if random.random() > 0.15:
                        continue
                    amt = random.uniform(150, 1000)
                    desc = "Local Chemist"
                else:
                    amt = random.uniform(50, 400)
                    desc = "Miscellaneous Spend"
                    
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
                
    # Add a few clear historical anomalies/outliers so the model knows what outliers look like
    # Outlier 1: Very large shopping purchase
    tx_date = now - datetime.timedelta(days=45)
    bootstrapped.append({
        "_id": ObjectId(),
        "user": user_oid,
        "date": tx_date.replace(hour=14, minute=30),
        "description": "Premium Electronics Store",
        "category": "Shopping",
        "amount": -85000.0,
        "type": "expense",
        "createdAt": tx_date
    })
    
    # Outlier 2: Unusual midnight transaction time (3 AM)
    tx_date = now - datetime.timedelta(days=72)
    bootstrapped.append({
        "_id": ObjectId(),
        "user": user_oid,
        "date": tx_date.replace(hour=3, minute=15),
        "description": "Late Night Lounge",
        "category": "Entertainment",
        "amount": -7500.0,
        "type": "expense",
        "createdAt": tx_date
    })
    
    # Outlier 3: Extremely high food transaction
    tx_date = now - datetime.timedelta(days=15)
    bootstrapped.append({
        "_id": ObjectId(),
        "user": user_oid,
        "date": tx_date.replace(hour=20, minute=45),
        "description": "Luxury Dining Banquet",
        "category": "Food & Dining",
        "amount": -22000.0,
        "type": "expense",
        "createdAt": tx_date
    })
    
    # Sort chronologically
    bootstrapped.sort(key=lambda x: x["date"])
    return bootstrapped
