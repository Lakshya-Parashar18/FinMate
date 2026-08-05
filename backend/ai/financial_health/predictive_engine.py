"""
Predictive_engine.py
Projects future Financial Health Scores across +1 month, +3 months, and +6 months.
"""

from typing import Dict, Any
from financial_health.utils import clamp_score, get_score_tier


class HealthPredictiveEngine:
    """Predicts future financial health trajectories using trend momentum."""

    @staticmethod
    def project_health(current_score: float, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        trajectory = trend_data.get("trajectory", "STABLE")

        delta = 0.0
        if trajectory == "IMPROVING":
            delta = 2.5
        elif trajectory == "DECLINING":
            delta = -2.5

        proj_1m = clamp_score(current_score + delta)
        proj_3m = clamp_score(current_score + (delta * 2.5))
        proj_6m = clamp_score(current_score + (delta * 4.5))

        return {
            "projectedScore_1m": proj_1m,
            "projectedTier_1m": get_score_tier(proj_1m),
            "projectedScore_3m": proj_3m,
            "projectedTier_3m": get_score_tier(proj_3m),
            "projectedScore_6m": proj_6m,
            "projectedTier_6m": get_score_tier(proj_6m)
        }


predictive_engine = HealthPredictiveEngine()
