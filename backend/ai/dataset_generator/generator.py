"""
Generator.py
Main CLI Execution Engine for the FinMate Synthetic Financial Dataset Generator.
Supports generating realistic Indian personal finance datasets from 10k up to 1 Million+ transactions.

Usage:
    python generator.py --rows 500000 --users 1000 --format BOTH
"""

import argparse
import random
import time
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Dict, Any

from config import (
    DEFAULT_NUMBER_OF_USERS,
    DEFAULT_NUMBER_OF_TRANSACTIONS,
    START_DATE,
    END_DATE,
    OUTPUT_FORMAT,
    CHUNK_SIZE,
    ANOMALY_PERCENTAGE,
    TRANSACTIONS_CSV_PATH,
    TRANSACTIONS_JSON_PATH,
    MERCHANT_METADATA_CSV_PATH,
    USER_PROFILES_CSV_PATH,
    MERCHANT_ALIASES_CSV_PATH,
    OUTPUT_DIR
)
from utils import logger, set_random_seed, parse_date, get_days_in_range
from merchant_database import MerchantDatabase
from user_profiles import UserProfileGenerator, UserProfile
from subscription_generator import SubscriptionGenerator
from transaction_generator import TransactionGenerator
from csv_exporter import CSVExporter
from json_exporter import JSONExporter


class FinancialDatasetGenerator:
    """Orchestrates multi-threaded / batch synthetic data generation."""

    def __init__(
        self,
        num_users: int = DEFAULT_NUMBER_OF_USERS,
        num_rows: int = DEFAULT_NUMBER_OF_TRANSACTIONS,
        start_date_str: str = START_DATE,
        end_date_str: str = END_DATE,
        output_format: str = OUTPUT_FORMAT,
        seed: int = 42,
        output_dir: Path = OUTPUT_DIR
    ):
        self.num_users = num_users
        self.num_rows = num_rows
        self.start_date = parse_date(start_date_str)
        self.end_date = parse_date(end_date_str)
        self.output_format = output_format.upper()
        self.seed = seed
        self.output_dir = output_dir

        set_random_seed(self.seed)

        logger.info("Initializing Merchant Database (500+ Indian Merchants)...")
        self.merchant_db = MerchantDatabase()

        logger.info(f"Generating {self.num_users} Synthetic User Profiles across 8 Personas...")
        self.user_gen = UserProfileGenerator()
        self.users = self.user_gen.generate_users(self.num_users)

        self.sub_gen = SubscriptionGenerator(self.merchant_db)
        self.txn_gen = TransactionGenerator(self.merchant_db, anomaly_rate=ANOMALY_PERCENTAGE)

    def generate_and_export(self) -> None:
        """Main dataset generation pipeline."""
        start_time = time.time()
        logger.info(f"Starting Generation of {self.num_rows:,} Transactions from {self.start_date} to {self.end_date}...")

        # 1. Export Metadata files
        self._export_auxiliary_metadata()

        # 2. Schedule recurring subscriptions
        logger.info("Scheduling recurring user subscriptions...")
        subscription_txns = []
        for user in self.users:
            subs = self.sub_gen.assign_user_subscriptions(user, self.start_date, self.end_date)
            subscription_txns.extend(subs)
        logger.info(f"Scheduled {len(subscription_txns):,} recurring subscription transactions.")

        # 3. Schedule monthly salary payouts
        logger.info("Scheduling monthly salary payouts...")
        days = get_days_in_range(self.start_date.strftime("%Y-%m-%d"), self.end_date.strftime("%Y-%m-%d"))
        salary_txns = []
        txn_counter = 1

        for day in days:
            if day.day in [1, 2, 5]:
                for user in self.users:
                    if user.salary_day == day.day:
                        s_txn = self.txn_gen.generate_salary_income_transaction(
                            f"TXN_{target_year(day)}_{txn_counter:07d}", user, day
                        )
                        salary_txns.append(s_txn)
                        txn_counter += 1

        logger.info(f"Scheduled {len(salary_txns):,} monthly salary payout transactions.")

        # Initialize Exporters
        csv_exp = CSVExporter(self.output_dir / "synthetic_transactions.csv") if self.output_format in ["CSV", "BOTH"] else None
        json_exp = JSONExporter(self.output_dir / "synthetic_transactions.json") if self.output_format in ["JSON", "BOTH"] else None

        # Pre-fill initial batch with salary and subscriptions
        pre_scheduled = []

        # Convert subscription dicts to full 29-column schema
        for sub_data in subscription_txns:
            user = next(u for u in self.users if u.user_id == sub_data["user_id"])
            full_sub_txn = self.txn_gen.generate_single_transaction(
                f"TXN_{target_year(sub_data['date'])}_{txn_counter:07d}",
                user,
                sub_data["date"],
                force_category=sub_data["category"],
                force_subscription=sub_data
            )
            pre_scheduled.append(full_sub_txn)
            txn_counter += 1

        pre_scheduled.extend(salary_txns)
        random.shuffle(pre_scheduled)

        # Write pre-scheduled initial chunk if needed
        current_rows_generated = 0

        if pre_scheduled:
            first_chunk = pre_scheduled[:self.num_rows]
            if csv_exp:
                csv_exp.write_chunk(first_chunk)
            if json_exp:
                json_exp.write_chunk(first_chunk)
            current_rows_generated += len(first_chunk)

        # 4. Generate remaining required transactions in memory-efficient chunks
        remaining_target = self.num_rows - current_rows_generated
        logger.info(f"Generating remaining {remaining_target:,} expense/transfer transactions in chunks of {CHUNK_SIZE:,}...")

        batch_buffer = []

        while current_rows_generated < self.num_rows:
            user = random.choice(self.users)
            target_date = random.choice(days)
            txn_id = f"TXN_{target_year(target_date)}_{txn_counter:07d}"

            txn = self.txn_gen.generate_single_transaction(txn_id, user, target_date)
            batch_buffer.append(txn)

            txn_counter += 1
            current_rows_generated += 1

            # Flush chunk when reaching CHUNK_SIZE or target
            if len(batch_buffer) >= CHUNK_SIZE or current_rows_generated == self.num_rows:
                if csv_exp:
                    csv_exp.write_chunk(batch_buffer)
                if json_exp:
                    json_exp.write_chunk(batch_buffer)

                logger.info(f"Flushed chunk: Total {current_rows_generated:,} / {self.num_rows:,} rows generated ({current_rows_generated / self.num_rows * 100:.1f}% complete)")
                batch_buffer = []

        elapsed = time.time() - start_time
        logger.info("=" * 70)
        logger.info(f"SUCCESS: Synthesized {self.num_rows:,} Transactions in {elapsed:.2f} seconds!")
        logger.info(f"Output CSV Path:  {self.output_dir / 'synthetic_transactions.csv'}")
        logger.info(f"Output JSON Path: {self.output_dir / 'synthetic_transactions.json'}")
        logger.info("=" * 70)

    def _export_auxiliary_metadata(self) -> None:
        """Exports merchant_metadata.csv, user_profiles.csv, and merchant_aliases.csv."""
        logger.info("Exporting auxiliary metadata files (merchant_metadata.csv, user_profiles.csv, merchant_aliases.csv)...")

        # 1. User Profiles
        df_users = UserProfileGenerator.export_user_profiles_dataframe(self.users)
        CSVExporter.export_dataframe(df_users, self.output_dir / "user_profiles.csv")

        # 2. Merchant Metadata
        df_merchants = self.merchant_db.export_metadata_dataframe()
        CSVExporter.export_dataframe(df_merchants, self.output_dir / "merchant_metadata.csv")

        # 3. Merchant Aliases
        df_aliases = self.merchant_db.export_aliases_dataframe()
        CSVExporter.export_dataframe(df_aliases, self.output_dir / "merchant_aliases.csv")


def target_year(dt: date) -> int:
    return dt.year


def main():
    parser = argparse.ArgumentParser(description="FinMate Synthetic Financial Dataset Generator")
    parser.add_argument("--rows", type=int, default=DEFAULT_NUMBER_OF_TRANSACTIONS, help="Total number of transactions to generate (e.g. 50000, 100000, 500000, 1000000)")
    parser.add_argument("--users", type=int, default=DEFAULT_NUMBER_OF_USERS, help="Total number of synthetic user profiles")
    parser.add_argument("--start-date", type=str, default=START_DATE, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, default=END_DATE, help="End date (YYYY-MM-DD)")
    parser.add_argument("--format", type=str, default=OUTPUT_FORMAT, choices=["CSV", "JSON", "BOTH"], help="Output format (CSV, JSON, or BOTH)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output-dir", type=str, default=str(OUTPUT_DIR), help="Output directory path")

    args = parser.parse_args()

    generator = FinancialDatasetGenerator(
        num_users=args.users,
        num_rows=args.rows,
        start_date_str=args.start_date,
        end_date_str=args.end_date,
        output_format=args.format,
        seed=args.seed,
        output_dir=Path(args.output_dir)
    )

    generator.generate_and_export()


if __name__ == "__main__":
    main()
