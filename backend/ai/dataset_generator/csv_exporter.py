"""
Csv_exporter.py
Provides streaming / chunked CSV export capabilities for high-performance generation up to 1 Million+ rows.
"""

import csv
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd
from utils import logger


class CSVExporter:
    """Handles CSV export of synthetic transactions and metadata with chunked writing."""

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._is_header_written = False

    def write_chunk(self, records: List[Dict[str, Any]]) -> None:
        """Appends a batch of transaction dictionaries to the CSV file."""
        if not records:
            return

        df = pd.DataFrame(records)
        mode = "a" if self._is_header_written else "w"
        header = not self._is_header_written

        df.to_csv(self.file_path, mode=mode, header=header, index=False)
        self._is_header_written = True
        logger.debug(f"Wrote chunk of {len(records)} rows to {self.file_path}")

    @staticmethod
    def export_dataframe(df: pd.DataFrame, file_path: Path) -> None:
        """Exports an entire DataFrame to CSV."""
        df.to_csv(file_path, index=False)
        logger.info(f"Successfully exported dataset to {file_path}")
