"""
Active_learning.py
Active Learning sampler that prioritizes low-confidence predictions, unknown merchants,
and frequently corrected transactions for model retraining.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
from learning.learning_config import UNKNOWN_MERCHANTS_CSV_PATH, LOW_CONFIDENCE_CSV_PATH, LOW_CONFIDENCE_THRESHOLD


class ActiveLearningManager:
    """Manages sampling and queuing of high-value active learning training instances."""

    def __init__(self):
        self.unknown_path = UNKNOWN_MERCHANTS_CSV_PATH
        self.low_conf_path = LOW_CONFIDENCE_CSV_PATH
        self.unknown_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_files()

    def _init_files(self):
        if not self.unknown_path.exists():
            pd.DataFrame(columns=["merchant", "description", "prediction", "confidence", "occurrence_count", "last_seen"]).to_csv(self.unknown_path, index=False)
        if not self.low_conf_path.exists():
            pd.DataFrame(columns=["merchant", "merchant_alias", "description", "prediction", "confidence", "timestamp"]).to_csv(self.low_conf_path, index=False)

    def record_unknown_merchant(self, merchant: str, description: str, prediction: str, confidence: float):
        """Records or increments occurrence count of an unknown merchant."""
        df = pd.read_csv(self.unknown_path)
        matching = df[df["merchant"].str.lower() == merchant.lower()]

        if not matching.empty:
            idx = matching.index[0]
            df.at[idx, "occurrence_count"] += 1
            df.at[idx, "last_seen"] = datetime.now().isoformat()
        else:
            new_row = {
                "merchant": merchant,
                "description": description or "",
                "prediction": prediction,
                "confidence": confidence,
                "occurrence_count": 1,
                "last_seen": datetime.now().isoformat()
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        df.to_csv(self.unknown_path, index=False)

    def record_low_confidence(self, merchant: str, merchant_alias: str, description: str, prediction: str, confidence: float):
        """Records low confidence prediction (< 70%) for priority retraining."""
        if confidence < LOW_CONFIDENCE_THRESHOLD:
            new_row = {
                "merchant": merchant,
                "merchant_alias": merchant_alias or merchant,
                "description": description or "",
                "prediction": prediction,
                "confidence": confidence,
                "timestamp": datetime.now().isoformat()
            }
            pd.DataFrame([new_row]).to_csv(self.low_conf_path, mode="a", header=not self.low_conf_path.exists(), index=False)

    def get_priority_samples(self) -> pd.DataFrame:
        """Loads and combines all active learning priority samples."""
        frames = []
        if self.unknown_path.exists():
            df_unk = pd.read_csv(self.unknown_path)
            if not df_unk.empty:
                df_unk["sample_source"] = "UnknownMerchant"
                frames.append(df_unk)

        if self.low_conf_path.exists():
            df_low = pd.read_csv(self.low_conf_path)
            if not df_low.empty:
                df_low["sample_source"] = "LowConfidence"
                frames.append(df_low)

        if frames:
            return pd.concat(frames, ignore_index=True)
        return pd.DataFrame()


active_learning = ActiveLearningManager()
