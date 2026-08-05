"""
Score_engine.py
Calculates 10 individual financial sub-component scores (0-100 scale) and weighted overall score.
"""

from typing import Dict, Any
from financial_health.config import SUB_SCORE_WEIGHTS
from financial_health.utils import clamp_score, get_score_tier


class FinancialScoreEngine:
    """Computes individual financial sub-scores and overall composite score."""

    @classmethod
    def calculate_sub_scores(cls, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Computes 10 sub-component scores on a 0-100 scale.
        """
        # 1. Savings Score
        savings_rate = features.get("savings_rate", 0.20)
        savings_score = clamp_score(min(100.0, savings_rate * 300.0))

        # 2. Budget Discipline Score
        util = features.get("budget_utilization", 0.80)
        violations = features.get("budget_violations", 0)
        base_budget = 100.0 - (max(0.0, util - 0.70) * 150.0)
        if violations > 0:
            base_budget -= 20.0
        budget_discipline_score = clamp_score(base_budget)

        # 3. Investment Habits Score
        inv_ratio = features.get("investment_ratio", 0.10)
        inv_freq = features.get("investment_frequency", 1)
        inv_score = clamp_score((inv_ratio * 400.0) + min(30.0, inv_freq * 10.0))
        investment_habits_score = inv_score

        # 4. Lifestyle Balance Score
        non_ess = features.get("non_essential_spending_ratio", 0.40)
        weekend_r = features.get("weekend_spending_ratio", 0.25)
        impulse_r = features.get("impulse_purchase_ratio", 0.10)
        lifestyle_score = 100.0 - (non_ess * 50.0 + weekend_r * 40.0 + impulse_r * 60.0)
        lifestyle_balance_score = clamp_score(lifestyle_score)

        # 5. Expense Stability Score
        volatility = features.get("expense_volatility", 500.0)
        growth = features.get("expense_growth_rate", 0.03)
        stability_score = 100.0 - (min(50.0, volatility / 100.0) + min(40.0, abs(growth) * 200.0))
        expense_stability_score = clamp_score(stability_score)

        # 6. Financial Consistency Score
        consistency = features.get("financial_consistency", 0.85)
        financial_consistency_score = clamp_score(consistency * 100.0)

        # 7. Emergency Preparedness Score
        emerg_ratio = features.get("emergency_savings_ratio", 3.0)  # Months of expenses
        emergency_preparedness_score = clamp_score(min(100.0, (emerg_ratio / 6.0) * 100.0))

        # 8. Goal Progress Score
        goal_prog = features.get("goal_progress", 0.60)
        goal_progress_score = clamp_score(goal_prog * 100.0)

        # 9. Cash Flow Management Score
        cash_flow = features.get("cash_flow_stability", 0.80)
        cash_flow_management_score = clamp_score(cash_flow * 100.0)

        # 10. Risk Exposure Score
        night_r = features.get("night_spending_ratio", 0.05)
        sub_r = features.get("subscription_ratio", 0.03)
        risk_score = 100.0 - (night_r * 200.0 + sub_r * 300.0)
        risk_exposure_score = clamp_score(risk_score)

        return {
            "savings_score": savings_score,
            "budget_discipline_score": budget_discipline_score,
            "investment_habits_score": investment_habits_score,
            "lifestyle_balance_score": lifestyle_balance_score,
            "expense_stability_score": expense_stability_score,
            "financial_consistency_score": financial_consistency_score,
            "emergency_preparedness_score": emergency_preparedness_score,
            "goal_progress_score": goal_progress_score,
            "cash_flow_management_score": cash_flow_management_score,
            "risk_exposure_score": risk_exposure_score
        }

    @classmethod
    def calculate_overall_score(cls, sub_scores: Dict[str, float]) -> Dict[str, Any]:
        """Calculates weighted overall score, tier, and sub-score dictionary."""
        total = 0.0
        for key, weight in SUB_SCORE_WEIGHTS.items():
            s_val = sub_scores.get(f"{key}_score", 75.0)
            total += s_val * weight

        overall_score = clamp_score(total)
        tier = get_score_tier(overall_score)

        return {
            "overallScore": overall_score,
            "tier": tier,
            "subScores": sub_scores
        }


score_engine = FinancialScoreEngine()
