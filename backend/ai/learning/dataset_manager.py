"""
Dataset_manager.py
Merges synthetic base data, user corrections, unknown merchants, and low-confidence samples
into a clean, deduplicated, and class-balanced training dataset.
"""

from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from learning.learning_config import (
    MERGED_TRAINING_CSV_PATH,
    FEEDBACK_CSV_PATH,
    UNKNOWN_MERCHANTS_CSV_PATH,
    LOW_CONFIDENCE_CSV_PATH,
    SUPPORTED_CATEGORIES
)
from categorization.config import DATASET_CSV_PATH
from categorization.engine_utils.logger import logger


class DatasetManager:
    """Manages merging, deduplication, label validation, and class balancing for retraining."""

    def __init__(self, output_path: Path = MERGED_TRAINING_CSV_PATH):
        self.output_path = output_path
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

    def merge_datasets(self) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Merges synthetic base dataset + feedback dataset + active learning samples.
        """
        frames = []
        stats = {
            "synthetic_samples": 0,
            "feedback_samples": 0,
            "unknown_merchant_samples": 0,
            "low_confidence_samples": 0,
            "total_merged_samples": 0
        }

        # 1. Base Synthetic Dataset
        if DATASET_CSV_PATH.exists():
            df_base = pd.read_csv(DATASET_CSV_PATH)
            df_base_clean = df_base[["merchant", "merchant_alias", "description", "category"]].dropna()
            df_base_clean = df_base_clean[df_base_clean["category"].isin(SUPPORTED_CATEGORIES)]
            frames.append(df_base_clean)
            stats["synthetic_samples"] = len(df_base_clean)

        # 2. User Feedback Dataset (High Priority Weight)
        if FEEDBACK_CSV_PATH.exists():
            df_fb = pd.read_csv(FEEDBACK_CSV_PATH)
            if not df_fb.empty:
                df_fb_clean = pd.DataFrame({
                    "merchant": df_fb["merchant"],
                    "merchant_alias": df_fb["merchant_alias"],
                    "description": df_fb["description"],
                    "category": df_fb["correct_category"]
                }).dropna()
                df_fb_clean = df_fb_clean[df_fb_clean["category"].isin(SUPPORTED_CATEGORIES)]
                frames.append(pd.concat([df_fb_clean] * 5, ignore_index=True))
                stats["feedback_samples"] = len(df_fb_clean)

        # 3. Unknown Merchants
        if UNKNOWN_MERCHANTS_CSV_PATH.exists():
            df_unk = pd.read_csv(UNKNOWN_MERCHANTS_CSV_PATH)
            if not df_unk.empty and "prediction" in df_unk.columns:
                df_unk_clean = pd.DataFrame({
                    "merchant": df_unk["merchant"],
                    "merchant_alias": df_unk["merchant"],
                    "description": df_unk["description"],
                    "category": df_unk["prediction"]
                }).dropna()
                df_unk_clean = df_unk_clean[df_unk_clean["category"].isin(SUPPORTED_CATEGORIES)]
                frames.append(df_unk_clean)
                stats["unknown_merchant_samples"] = len(df_unk_clean)

        if not frames:
            raise FileNotFoundError("No datasets available for merging.")

        # 4. Concatenate and Deduplicate
        merged_df = pd.concat(frames, ignore_index=True)
        merged_df = merged_df.drop_duplicates(subset=["merchant", "description", "category"]).reset_index(drop=True)

        # 5. Handle Class Imbalance via Oversampling underrepresented classes
        cat_counts = merged_df["category"].value_counts()
        max_count = cat_counts.max()
        balanced_frames = []

        for category, count in cat_counts.items():
            df_cat = merged_df[merged_df["category"] == category]
            if count < (max_count * 0.20):
                multiplier = int(np.ceil((max_count * 0.20) / count))
                df_cat = pd.concat([df_cat] * multiplier, ignore_index=True)
            balanced_frames.append(df_cat)

        final_df = pd.concat(balanced_frames, ignore_index=True).sample(frac=1.0, random_state=42).reset_index(drop=True)
        stats["total_merged_samples"] = len(final_df)

        final_df.to_csv(self.output_path, index=False)
        logger.info(f"Successfully merged datasets into {self.output_path} ({len(final_df):,} total samples)")

        return final_df, stats


dataset_manager = DatasetManager()
