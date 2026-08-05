"""
Trend_analysis.py
Analyzes multi-window financial trajectories across 1-month, 3-month, 6-month, and 12-month periods.
"""

from typing import Dict, Any, List


class TrendAnalyzer:
    """Analyzes historical trajectories across multiple time windows."""

    @staticmethod
    def analyze_trends(features: Dict[str, Any]) -> Dict[str, Any]:
        spend_30d = features.get("rolling_30d_spend", 45000.0)
        spend_90d_avg = features.get("rolling_90d_spend", 135000.0) / 3.0

        diff = spend_30d - spend_90d_avg
        if diff > 3000:
            trajectory = "DECLINING"
            summary = "Recent 30-day spending is higher than your 3-month average."
        elif diff < -3000:
            trajectory = "IMPROVING"
            summary = "Recent 30-day spending is lower than your 3-month average."
        else:
            trajectory = "STABLE"
            summary = "Spending remains stable across monthly timeframes."

        return {
            "trajectory": trajectory,
            "monthlyComparison": {
                "lastMonthSpend": spend_30d,
                "threeMonthAvgSpend": round(spend_90d_avg, 2)
            },
            "summary": summary
        }


trend_analyzer = TrendAnalyzer()
