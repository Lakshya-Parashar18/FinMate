"""
Recommendation_engine.py
Personalized recommendation engine generating actionable financial advice tailored to individual behavior.
"""

from typing import Dict, Any, List


class PersonalizedRecommendationEngine:
    """Generates specific, personalized financial action items."""

    @staticmethod
    def generate_recommendations(features: Dict[str, Any], current_score: float) -> List[Dict[str, Any]]:
        recommendations = []

        monthly_spending = features.get("monthly_spending", 40000.0)
        non_ess = features.get("non_essential_spending_ratio", 0.40)
        inv_ratio = features.get("investment_ratio", 0.10)
        monthly_income = features.get("monthly_income", 75000.0)
        emerg_months = features.get("emergency_savings_ratio", 3.0)

        # 1. Dining & Shopping Reduction
        if non_ess > 0.35:
            cut_amount = round(monthly_spending * 0.08, -2)  # Round to nearest hundred
            target_score = min(100.0, current_score + 4.5)
            recommendations.append({
                "category": "Food & Dining",
                "action": f"Reduce dining and non-essential shopping expenses by ₹{int(cut_amount):,}/month.",
                "projectedScoreImprovement": f"Improves overall health score from {current_score:.0f} to {target_score:.0f}.",
                "priority": "HIGH"
            })

        # 2. SIP Increase
        if inv_ratio < 0.20:
            suggested_sip = round(monthly_income * 0.05, -2)
            target_score = min(100.0, current_score + 3.8)
            recommendations.append({
                "category": "Investments",
                "action": f"Increase monthly SIP investment contributions by ₹{int(suggested_sip):,}/month.",
                "projectedScoreImprovement": f"Boosts investment habits sub-score by +12 points.",
                "priority": "MEDIUM"
            })

        # 3. Emergency Reserve Building
        if emerg_months < 6.0:
            recommendations.append({
                "category": "Savings",
                "action": f"Automate ₹2,500/month into liquid savings to reach 6 months of emergency reserves.",
                "projectedScoreImprovement": "Enhances emergency preparedness sub-score.",
                "priority": "HIGH"
            })

        # 4. Subscription Optimization
        sub_ratio = features.get("subscription_ratio", 0.03)
        if sub_ratio > 0.02:
            recommendations.append({
                "category": "Subscriptions",
                "action": "Audit recurring OTT & digital subscriptions to save ~₹600/month.",
                "projectedScoreImprovement": "Lowers recurring expense volatility.",
                "priority": "LOW"
            })

        return recommendations


recommendation_engine = PersonalizedRecommendationEngine()
