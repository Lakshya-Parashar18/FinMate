"""
Quality_monitor.py
Tracks model quality metrics, correction rates, unknown merchant rates, and top corrected merchants.
"""

from typing import Dict, Any
import pandas as pd
from learning.learning_config import FEEDBACK_CSV_PATH, UNKNOWN_MERCHANTS_CSV_PATH
from ai_utils.logger import logger


class QualityMonitor:
    """Monitors model categorization accuracy, feedback corrections, and merchant error rates."""

    def get_quality_metrics(self) -> Dict[str, Any]:
        fb_count = 0
        top_corrected = []

        if FEEDBACK_CSV_PATH.exists():
            df_fb = pd.read_csv(FEEDBACK_CSV_PATH)
            fb_count = len(df_fb)
            if not df_fb.empty and "merchant" in df_fb.columns:
                top_corrected = df_fb["merchant"].value_counts().head(5).to_dict()

        unk_count = 0
        if UNKNOWN_MERCHANTS_CSV_PATH.exists():
            df_unk = pd.read_csv(UNKNOWN_MERCHANTS_CSV_PATH)
            unk_count = len(df_unk)

        return {
            "totalFeedbackCorrections": fb_count,
            "totalUnknownMerchantsDiscovered": unk_count,
            "topCorrectedMerchants": top_corrected
        }


quality_monitor = QualityMonitor()
