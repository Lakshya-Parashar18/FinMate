"""
Behavior_analysis.py
Analyzes essential vs non-essential spending, impulse purchases, and weekend/night patterns.
"""

from typing import Dict, Any


class BehaviorAnalyzer:
    """Analyzes behavioral spending patterns."""

    @staticmethod
    def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
        ess_ratio = features.get("essential_spending_ratio", 0.60)
        non_ess_ratio = features.get("non_essential_spending_ratio", 0.40)
        weekend_r = features.get("weekend_spending_ratio", 0.25)
        night_r = features.get("night_spending_ratio", 0.05)
        impulse_r = features.get("impulse_purchase_ratio", 0.10)

        insights = []
        if non_ess_ratio > 0.45:
            insights.append("Non-essential discretionary spending is elevated (above 45% of total budget).")
        else:
            insights.append("Discretionary vs essential spending balance is healthy.")

        if weekend_r > 0.35:
            insights.append("Weekend spending accounts for a significant portion of monthly expenses.")

        if impulse_r > 0.15:
            insights.append("Impulse purchases under ₹2,000 are impacting monthly savings goals.")

        return {
            "essentialRatio": round(ess_ratio * 100, 2),
            "nonEssentialRatio": round(non_ess_ratio * 100, 2),
            "weekendSpendingRatio": round(weekend_r * 100, 2),
            "nightSpendingRatio": round(night_r * 100, 2),
            "impulsePurchaseRatio": round(impulse_r * 100, 2),
            "insights": insights
        }


behavior_analyzer = BehaviorAnalyzer()
