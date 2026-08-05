"""
Savings_analysis.py
Analyzes monthly savings rate and emergency fund coverage.
"""

from typing import Dict, Any


class SavingsAnalyzer:
    """Analyzes savings rates and emergency fund reserves."""

    @staticmethod
    def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
        savings_rate = features.get("savings_rate", 0.20)
        emerg_ratio = features.get("emergency_savings_ratio", 3.0)

        status = "HEALTHY" if savings_rate >= 0.20 else "LOW_SAVINGS"

        return {
            "savingsRatePercent": round(savings_rate * 100, 2),
            "emergencyFundMonths": emerg_ratio,
            "status": status,
            "targetSavingsRate": 25.0
        }


savings_analyzer = SavingsAnalyzer()
