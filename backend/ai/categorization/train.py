"""
Train.py
CLI script to trigger the full AI Transaction Categorization Model Training Pipeline.

Usage:
    python train.py --samples 50000
"""

import argparse
import sys
from pathlib import Path

# Ensure root categorization directory is on sys.path BEFORE importing local packages
CAT_DIR = Path(__file__).resolve().parent
if str(CAT_DIR) not in sys.path:
    sys.path.insert(0, str(CAT_DIR))

from models.training import TrainingPipeline
from engine_utils.logger import logger


def main():
    parser = argparse.ArgumentParser(description="Train AI Transaction Categorization Model")
    parser.add_argument("--samples", type=int, default=None, help="Maximum number of dataset rows to use for training")
    args = parser.parse_args()

    logger.info("Initializing FinMate AI Categorization Model Training...")
    pipeline = TrainingPipeline()
    metrics = pipeline.run_pipeline(max_samples=args.samples)

    logger.info(f"Model Training Complete! Accuracy: {metrics['accuracy']:.4f}, Top-3 Accuracy: {metrics['top3_accuracy']:.4f}, F1-Weighted: {metrics['f1_weighted']:.4f}")


if __name__ == "__main__":
    main()
