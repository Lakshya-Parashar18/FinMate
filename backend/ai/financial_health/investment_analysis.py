"""
Investment_analysis.py
Analyzes investment frequency, SIP contributions, and wealth accumulation ratios.
"""

from typing import Dict, Any


class InvestmentAnalyzer:
    """Analyzes investment patterns and wealth accumulation habits."""

    @staticmethod
    def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
        inv_ratio = features.get("investment_ratio", 0.15)
        inv_freq = features.get("investment_frequency", 2)

        return {
            "investmentRatioPercent": round(inv_ratio * 100, 2),
            "monthlyInvestmentFrequency": inv_freq,
            "status": "STRONG" if inv_ratio >= 0.15 else "MODERATE",
            "targetInvestmentRatio": 20.0
        }


investment_analyzer = InvestmentAnalyzer()
