"""
Predict.py
CLI script to run inference on single transactions or batch inputs.

Usage:
    python predict.py --merchant "SWIGGY*PAY BANGALORE" --desc "Chicken Biryani & Coke"
"""

import argparse
import json
import sys
from pathlib import Path

# Ensure root categorization directory is on sys.path BEFORE importing local packages
CAT_DIR = Path(__file__).resolve().parent
if str(CAT_DIR) not in sys.path:
    sys.path.insert(0, str(CAT_DIR))

from models.prediction import Predictor
from engine_utils.logger import logger


def main():
    parser = argparse.ArgumentParser(description="Predict Transaction Category using AI Engine")
    parser.add_argument("--merchant", type=str, default="SWIGGY*PAY BANGALORE", help="Merchant name or alias string")
    parser.add_argument("--alias", type=str, default=None, help="Raw merchant alias")
    parser.add_argument("--desc", type=str, default=None, help="Transaction item description")
    parser.add_argument("--notes", type=str, default=None, help="Transaction notes")

    args = parser.parse_args()

    predictor = Predictor()
    result = predictor.predict_single(
        merchant=args.merchant,
        alias=args.alias,
        description=args.desc,
        notes=args.notes
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
