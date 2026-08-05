"""
Ai_gateway.py
Central AI Gateway routing requests across all AI platform services
(Categorization, Financial Health Intelligence, Forecasting, Anomaly Detection, Recommendations).
"""

from typing import Dict, Any, List, Optional
from inference.inference_engine import platform_inference_engine
from feature_store.feature_store import central_feature_store
from monitoring.health_inspector import platform_health_inspector
from registry.model_registry import platform_model_registry
from feedback.feedback_manager import platform_feedback_manager
from financial_health.engine import financial_intelligence_engine


class AIGatewayService:
    """Central AI Gateway entrypoint for all backend AI capabilities."""

    def __init__(self):
        self.inference = platform_inference_engine
        self.feature_store = central_feature_store
        self.health = platform_health_inspector
        self.registry = platform_model_registry
        self.feedback = platform_feedback_manager
        self.financial_health = financial_intelligence_engine

    def categorize_transaction(
        self,
        merchant: str,
        alias: Optional[str] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Categorizes a single transaction via Central AI Gateway."""
        if category and category != "Miscellaneous":
            self.feedback.record_user_correction(merchant, category, description)
            return {
                "merchant": merchant,
                "category": category,
                "confidence": 1.0,
                "confidenceLevel": "HIGH",
                "isUserOverridden": True
            }

        res = self.inference.predict_single(merchant, alias, description, notes)

        # Update Feature Store
        norm_m = res.get("aiMetadata", {}).get("merchantNormalized", merchant)
        self.feature_store.update_merchant_feature(merchant, norm_m, 0.0, res["predictedCategory"])

        # Track unknown merchants in feedback system
        if res.get("aiMetadata", {}).get("isUnknownMerchant"):
            self.feedback.record_unknown(merchant, description or "", res["predictedCategory"], res["confidence"])

        return res

    def batch_categorize(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch categorizes transactions via Central AI Gateway."""
        results = []
        for txn in transactions:
            r = self.categorize_transaction(
                merchant=txn.get("merchant", ""),
                alias=txn.get("merchant_alias"),
                description=txn.get("description"),
                notes=txn.get("notes"),
                category=txn.get("category")
            )
            results.append(r)
        return {"transactions": results, "count": len(results)}

    def get_financial_health_score(self, user_id: str = "default_user", transactions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Evaluates user financial health via AI Financial Intelligence Engine."""
        return self.financial_health.evaluate_financial_health(transactions=transactions or [])

    def get_spending_forecast(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Future Spending Forecast Service Stub."""
        return {
            "user_id": user_id,
            "forecast_days": days,
            "projected_spending": 24500.0,
            "confidence": 0.88,
            "status": "STUB_READY"
        }

    def get_anomaly_detection(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Future Anomaly Detection Service Stub."""
        return {
            "is_anomaly": False,
            "anomaly_score": 0.05,
            "reason": "Normal spending pattern",
            "status": "STUB_READY"
        }

    def get_platform_status(self) -> Dict[str, Any]:
        return self.health.inspect_health()


ai_gateway = AIGatewayService()
