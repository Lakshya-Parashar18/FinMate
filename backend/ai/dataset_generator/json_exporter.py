"""
Json_exporter.py
Provides streaming JSON / JSONL export capabilities for large-scale dataset generation.
"""

import json
from pathlib import Path
from typing import List, Dict, Any
from utils import logger


class JSONExporter:
    """Handles JSON export with chunked streaming to prevent high memory usage."""

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._first_chunk = True

    def write_chunk(self, records: List[Dict[str, Any]]) -> None:
        """Appends a batch of transaction dictionaries as JSON Lines or JSON array format."""
        if not records:
            return

        mode = "w" if self._first_chunk else "a"

        with open(self.file_path, mode, encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

        self._first_chunk = False
        logger.debug(f"Wrote chunk of {len(records)} JSON rows to {self.file_path}")

    @staticmethod
    def export_json(records: List[Dict[str, Any]], file_path: Path) -> None:
        """Exports full record set as standard JSON array."""
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        logger.info(f"Successfully exported JSON dataset to {file_path}")
