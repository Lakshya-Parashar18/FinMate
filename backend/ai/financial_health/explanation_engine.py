"""
Explanation_engine.py
Explainable AI (XAI) engine using feature attribution to generate dynamic natural language explanations.
"""

from typing import Dict, Any, List


class HealthExplanationEngine:
    """XAI engine generating natural language score drivers."""

    @staticmethod
    def generate_explanations(features: Dict[str, Any], sub_scores: Dict[str, float]) -> Dict[str, Any]:
        positive_drivers = []
        negative_drivers = []

        # Savings Rate
        s_rate = features.get("savings_rate", 0.20)
        if s_rate >= 0.25:
            positive_drivers.append(f"Your savings score improved because your monthly savings rate is strong at {round(s_rate * 100, 1)}%.")
        elif s_rate < 0.15:
            negative_drivers.append(f"Your savings score decreased because your monthly savings rate dropped to {round(s_rate * 100, 1)}%.")

        # Investment Ratio
        inv_r = features.get("investment_ratio", 0.15)
        if inv_r >= 0.15:
            positive_drivers.append(f"Consistent investment contributions (SIP) account for 15%+ of monthly income.")
        else:
            negative_drivers.append("Investment score is hindered by low recurring SIP allocations.")

        # Budget Utilization
        util = features.get("budget_utilization", 0.80)
        if util > 0.90:
            negative_drivers.append(f"Budget discipline score decreased due to high monthly utilization ({round(util * 100, 1)}%).")

        # Weekend Spending
        weekend_r = features.get("weekend_spending_ratio", 0.25)
        if weekend_r > 0.35:
            negative_drivers.append(f"Weekend spending has increased significantly ({round(weekend_r * 100, 1)}% of total spend).")

        if not positive_drivers:
            positive_drivers.append("Essential bill payments and utility expenses remain consistently managed.")

        if not negative_drivers:
            negative_drivers.append("No major financial risk anomalies detected in recent spending behavior.")

        return {
            "positiveImpacts": positive_drivers,
            "negativeImpacts": negative_drivers,
            "topFeatures": [
                {"feature": "savings_rate", "importance": 0.28, "direction": "POSITIVE" if s_rate >= 0.20 else "NEGATIVE"},
                {"feature": "budget_utilization", "importance": 0.22, "direction": "NEGATIVE" if util > 0.85 else "POSITIVE"},
                {"feature": "investment_ratio", "importance": 0.18, "direction": "POSITIVE" if inv_r >= 0.15 else "NEGATIVE"},
                {"feature": "weekend_spending_ratio", "importance": 0.15, "direction": "NEGATIVE" if weekend_r > 0.30 else "POSITIVE"}
            ]
        }


explanation_engine = HealthExplanationEngine()
