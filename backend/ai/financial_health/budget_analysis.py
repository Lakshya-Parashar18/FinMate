"""
Budget_analysis.py
Analyzes budget utilization, category limits, and budget violations.
"""

from typing import Dict, Any


class BudgetAnalyzer:
    """Analyzes budget utilization and discipline."""

    @staticmethod
    def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
        util = features.get("budget_utilization", 0.80)
        violations = features.get("budget_violations", 0)

        status = "WELL_CONTROLLED"
        if util > 1.0:
            status = "EXCEEDED"
        elif util > 0.85:
            status = "HIGH_UTILIZATION"

        return {
            "budgetUtilizationPercent": round(util * 100, 2),
            "budgetViolationsCount": violations,
            "status": status,
            "recommendation": "Maintain spending under 80% of budget limit to improve financial health."
        }


budget_analyzer = BudgetAnalyzer()
