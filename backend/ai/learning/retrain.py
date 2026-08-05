"""
Retrain.py
CLI entrypoint to trigger the Continuous Learning Model Retraining Pipeline.

Usage:
    python retrain.py --force
"""

import argparse
import json
import sys
from pathlib import Path

# Ensure root categorization and learning paths are on sys.path
LEARNING_DIR = Path(__file__).resolve().parent
AI_DIR = LEARNING_DIR.parent

for p in [str(LEARNING_DIR), str(AI_DIR / "categorization"), str(AI_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from retraining_service import retraining_service
from categorization.engine_utils.logger import logger


def main():
    parser = argparse.ArgumentParser(description="Trigger FinMate AI Model Retraining Pipeline")
    parser.add_argument("--force", action="store_true", help="Force deployment even if metrics do not exceed current model")
    args = parser.parse_args()

    logger.info("Executing FinMate AI Retraining CLI...")
    result = retraining_service.execute_retraining(force_deploy=args.force)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
