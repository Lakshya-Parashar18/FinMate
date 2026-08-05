"""
Dataset_versioner.py
Dataset versioning manager tracking generation dates, sample counts, and metadata tags without overwriting.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
from config.platform_config import DATASETS_DIR
from ai_utils.logger import logger


class DatasetVersioner:
    """Manages immutable dataset version releases and metadata cataloging."""

    def __init__(self, datasets_dir: Path = DATASETS_DIR):
        self.datasets_dir = datasets_dir
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        self.catalog_path = self.datasets_dir / "dataset_catalog.json"
        self._init_catalog()

    def _init_catalog(self):
        if not self.catalog_path.exists():
            with open(self.catalog_path, "w", encoding="utf-8") as f:
                json.dump({"datasets": []}, f, indent=2)

    def register_dataset_version(
        self,
        source_csv: Path,
        version_tag: str,
        synthetic_ratio: float = 1.0,
        feedback_ratio: float = 0.0
    ) -> Dict[str, Any]:
        """
        Copies source CSV to immutable datasets/<version_tag>.csv and registers metadata.
        """
        if not source_csv.exists():
            raise FileNotFoundError(f"Source dataset not found at {source_csv}")

        target_csv = self.datasets_dir / f"{version_tag}.csv"
        shutil.copy2(source_csv, target_csv)

        df = pd.read_csv(target_csv)
        num_samples = len(df)
        categories = df["category"].value_counts().to_dict() if "category" in df.columns else {}
        merchant_count = df["merchant"].nunique() if "merchant" in df.columns else 0

        metadata = {
            "version": version_tag,
            "generation_date": datetime.now().isoformat(),
            "number_of_samples": num_samples,
            "merchant_count": merchant_count,
            "synthetic_ratio": synthetic_ratio,
            "feedback_ratio": feedback_ratio,
            "categories_distribution": categories,
            "file_path": str(target_csv)
        }

        with open(self.catalog_path, "r+", encoding="utf-8") as f:
            data = json.load(f)
            data["datasets"].append(metadata)
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()

        logger.info(f"Registered immutable dataset version '{version_tag}' with {num_samples:,} samples.")
        return metadata


dataset_versioner = DatasetVersioner()
