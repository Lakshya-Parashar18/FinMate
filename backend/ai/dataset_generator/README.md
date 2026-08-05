# FinMate Synthetic Financial Dataset Generator Engine

A modular, production-grade synthetic personal finance data generation engine designed specifically for training Machine Learning and Deep Learning models in personal financial management, expense categorization, spending forecasting, anomaly detection, merchant normalization, and financial health scoring.

---

## Key Features

- **Realistic Indian Personal Finance Behavior**: Simulates real-world Indian spending habits across major cities, festivals, payment channels (UPI, Cards, Net Banking, Cash), salary cycles, recurring subscriptions, and shopping surges.
- **Strict Category Schema**: Supports strictly 13 standardized expense categories:
  - `Food & Dining`
  - `Groceries`
  - `Transportation`
  - `Rent & Housing`
  - `Entertainment`
  - `Healthcare`
  - `Education`
  - `Shopping`
  - `Utilities`
  - `Investments`
  - `Vacation`
  - `Grooming`
  - `Miscellaneous`
- **500+ Indian Merchant Catalog**: Includes realistic aliases, pricing ranges, city availability, and common itemized transaction descriptions for brands like Swiggy, Zomato, Uber, Ola, D-Mart, Blinkit, Amazon India, Flipkart, Myntra, Nykaa, Zerodha, Groww, Apollo Pharmacy, BESCOM, Airtel, etc.
- **8 Distinct User Personas**:
  - `Student`
  - `Working Professional`
  - `Software Engineer`
  - `Freelancer`
  - `Business Owner`
  - `Family`
  - `Investor`
  - `Retired`
- **Temporal & Festival Dynamics**:
  - Salary payouts (1st–5th of month), Rent payments (1st week), Utility bills, 30-day recurring subscription cycles.
  - Indian sales & festivals: Diwali, Great Indian Festival, Big Billion Days, Holi, Raksha Bandhan, Christmas/New Year, Wedding Season, Black Friday, Republic Day Sales.
  - Time-of-day distributions (Breakfast, Lunch, Tea/Snacks, Dinner, Nightlife, Market Hours).
- **Financial Anomaly Injection**: Injects 2–5% realistic financial anomalies (huge gadget purchases, 5-star hotel dinners, abnormal fuel charges, large ATM cash withdrawals) flagged with `is_anomaly = 1` and notes.
- **High-Performance Streaming Generation**: Handles scaling from 10,000 up to 1,000,000+ transactions with chunked streaming memory efficiency.

---

## Directory Structure

```text
backend/ai/dataset_generator/
├── config.py                 # Central configuration settings & feature toggles
├── generator.py              # CLI entry point & dataset orchestrator
├── merchant_database.py      # 500+ Indian merchant database with aliases & pricing
├── user_profiles.py          # 8 User personas & financial behavioral weights
├── transaction_generator.py  # 29-column schema row synthesis engine
├── amount_generator.py       # Realistic INR pricing & psychological pricing rules
├── description_generator.py  # Itemized transaction descriptions & notes
├── date_generator.py         # Datetime, time-of-day, & weekend pattern logic
├── subscription_generator.py # 30-day recurring subscription scheduler
├── payment_generator.py      # UPI, Credit Card, Debit Card, Net Banking selector
├── festival_generator.py     # Indian shopping festival surge multipliers
├── anomaly_generator.py      # 2-5% financial anomaly injector
├── location_generator.py     # Indian cities, states, and localized areas
├── csv_exporter.py           # Chunked streaming CSV exporter
├── json_exporter.py          # Streaming JSON / JSONL exporter
├── utils.py                  # Seed control, date formatting, and logging
├── requirements.txt          # Python dependencies (pandas, numpy, faker, tqdm)
└── generated/                # Output directory for generated CSVs & JSONs
    ├── synthetic_transactions.csv
    ├── synthetic_transactions.json
    ├── merchant_metadata.csv
    ├── user_profiles.csv
    └── merchant_aliases.csv
```

---

## Quick Start & CLI Usage

### Install Dependencies
```bash
pip install -r backend/ai/dataset_generator/requirements.txt
```

### Generate 100,000 Transactions (Default)
```bash
python backend/ai/dataset_generator/generator.py
```

### Generate 500,000 Transactions in both CSV and JSON
```bash
python backend/ai/dataset_generator/generator.py --rows 500000 --users 1000 --format BOTH
```

### Generate 1 Million Transactions for Scale Testing
```bash
python backend/ai/dataset_generator/generator.py --rows 1000000 --users 2500 --seed 42
```

---

## Output Schema (29 Columns)

| Column Name | Type | Description |
|---|---|---|
| `transaction_id` | String | Unique transaction identifier (e.g. `TXN_2025_0000001`) |
| `user_id` | String | Unique user profile identifier (e.g. `USR_00042`) |
| `date` | String | Date of transaction (`YYYY-MM-DD`) |
| `time` | String | Time of transaction (`HH:MM:SS`) |
| `merchant` | String | Official clean merchant name (e.g. `Swiggy`) |
| `merchant_alias` | String | Raw bank/card transaction string (e.g. `SWIGGY*BANGALORE`) |
| `description` | String | Itemized description (e.g. `Chicken Biryani & Coke`) |
| `amount` | Float | Transaction amount in INR |
| `currency` | String | Currency code (`INR`) |
| `category` | String | One of the 13 strict supported categories |
| `payment_method` | String | `UPI`, `Credit Card`, `Debit Card`, `Cash`, `Net Banking`, `Wallet` |
| `location` | String | Locality and city (e.g. `Koramangala, Bangalore`) |
| `city` | String | Indian city |
| `state` | String | Indian state |
| `day_of_week` | String | `Monday` through `Sunday` |
| `month` | Integer | Month number (`1-12`) |
| `year` | Integer | Year (`2025`) |
| `hour` | Integer | Hour of day (`0-23`) |
| `minute` | Integer | Minute (`0-59`) |
| `is_weekend` | Integer | Binary flag (`1` for Saturday/Sunday, `0` otherwise) |
| `is_subscription` | Integer | Binary flag (`1` for recurring subscription, `0` otherwise) |
| `subscription_frequency` | String | `Monthly`, `Quarterly`, `Annual`, or `N/A` |
| `income` | Float | User's monthly income |
| `user_persona` | String | One of 8 personas (e.g. `Software Engineer`) |
| `salary_day` | String | Salary payout day of month (`1`, `2`, `5`, or `Irregular`) |
| `budget` | Float | User's monthly budget limit |
| `transaction_type` | String | `expense`, `income`, `transfer` |
| `is_anomaly` | Integer | Binary flag (`1` for financial anomaly, `0` otherwise) |
| `notes` | String | Human readable transaction notes or anomaly flag details |

---

## Machine Learning Applications

This dataset directly enables training of:
1. **Transaction Categorization**: Train NLP / FastText / BERT models mapping `merchant_alias` & `description` to `category`.
2. **Spending Forecast**: Train Prophet / LSTM / XGBoost models predicting monthly spending from temporal features and past transactions.
3. **Budget Recommendation**: Train Clustering / Regression models to suggest realistic monthly budgets per persona & income level.
4. **Financial Health Score**: Train scoring algorithms evaluating savings rate, impulse ratio, and budget adherence.
5. **Anomaly Detection**: Train Isolation Forest / Autoencoders / One-Class SVM models detecting `is_anomaly = 1` rows.
6. **Merchant Normalization & Similarity**: Train Fuzzy Matching / Embedding models mapping messy `merchant_alias` strings to clean `merchant` entities.
