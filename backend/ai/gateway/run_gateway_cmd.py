"""
Run_gateway_cmd.py
CLI bridge script for Express Node.js backend to execute AI Gateway actions via child_process.

Usage:
    python run_gateway_cmd.py categorize '{"merchant":"Swiggy"}'
    python run_gateway_cmd.py financial_health '{"user_id":"123"}'
"""

import sys
import json
from pathlib import Path

# Add backend/ai to sys.path
AI_DIR = Path(__file__).resolve().parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from gateway.ai_gateway import ai_gateway


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]
    payload_str = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        payload = json.loads(payload_str)
    except Exception:
        payload = {}

    try:
        if action == "categorize":
            res = ai_gateway.categorize_transaction(
                merchant=payload.get("merchant", ""),
                alias=payload.get("merchant_alias"),
                description=payload.get("description"),
                notes=payload.get("notes"),
                category=payload.get("category")
            )

        elif action == "batch_categorize":
            items = payload.get("transactions", [])
            res = ai_gateway.batch_categorize(items)

        elif action == "financial_health":
            user_id = payload.get("user_id", "default_user")
            txns = payload.get("transactions", [])
            res = ai_gateway.get_financial_health_score(user_id=user_id, transactions=txns)

        elif action == "status" or action == "health":
            res = ai_gateway.get_platform_status()

        elif action == "feedback":
            res = ai_gateway.feedback.record_user_correction(
                merchant=payload.get("merchant", ""),
                correct_category=payload.get("correct_category", "Miscellaneous"),
                description=payload.get("description")
            )

        else:
            res = {"error": f"Unknown AI action '{action}'"}

        print(json.dumps(res))

    except Exception as e:
        print(json.dumps({"error": f"AI Gateway Exception: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
