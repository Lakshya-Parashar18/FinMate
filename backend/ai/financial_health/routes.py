"""
Routes.py
FastAPI router exposing financial intelligence endpoints.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from financial_health.engine import financial_intelligence_engine

router = APIRouter(prefix="/api/ai/financial-health", tags=["FinMate AI Financial Intelligence Engine"])


class EvaluateHealthPayload(BaseModel):
    monthly_income: Optional[float] = Field(75000.0, example=75000.0)
    monthly_budget: Optional[float] = Field(50000.0, example=50000.0)
    current_savings: Optional[float] = Field(120000.0, example=120000.0)
    transactions: Optional[List[Dict[str, Any]]] = Field([], example=[])


@router.get("")
@router.get("/")
def get_financial_health():
    """Returns baseline overall score, component scores, trends, predictions, and recommendations."""
    return financial_intelligence_engine.evaluate_financial_health(transactions=[])


@router.post("/evaluate")
def evaluate_financial_health_custom(payload: EvaluateHealthPayload):
    """Evaluates customized transaction history and returns full financial intelligence report."""
    return financial_intelligence_engine.evaluate_financial_health(
        transactions=payload.transactions or [],
        monthly_income=payload.monthly_income or 75000.0,
        monthly_budget=payload.monthly_budget or 50000.0,
        current_savings=payload.current_savings or 120000.0
    )


@router.get("/prediction")
def get_health_predictions():
    """Gets projected financial health trajectories across +1m, +3m, +6m."""
    health = financial_intelligence_engine.evaluate_financial_health(transactions=[])
    return health.get("predictions", {})


@router.get("/history")
def get_health_history():
    """Gets historical financial health score trajectory."""
    return {
        "history": [
            {"month": "May 2026", "score": 78, "tier": "GOOD"},
            {"month": "Jun 2026", "score": 81, "tier": "GOOD"},
            {"month": "Jul 2026", "score": 84, "tier": "GOOD"}
        ]
    }
