"""
Risk_analysis.py
Analyzes expense volatility, cash flow stability, subscription risk, and impulse risks.
"""

from typing import Dict, Any


class RiskAnalyzer:
    """Analyzes financial risk exposure and cash flow volatility."""

    @staticmethod
    def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
        volatility = features.get("expense_volatility", 100.0)
        cash_flow = features.get("cash_flow_stability", 0.85)

        risk_level = "LOW"
        if cash_flow < 0.60 or volatility > 500.0:
            risk_level = "HIGH"
        elif cash_flow < 0.75:
            risk_level = "MEDIUM"

        return {
            "riskLevel": risk_level,
            "expenseVolatility": volatility,
            "cashFlowStabilityScore": round(cash_flow * 100, 2)
        }


risk_analyzer = RiskAnalyzer()
