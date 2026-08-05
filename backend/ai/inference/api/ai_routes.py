"""
Ai_routes.py
Production FastAPI API router for AI Transaction Categorization inference & telemetry.

Endpoints:
- POST /api/ai/categorize        (Single transaction prediction with failsafe)
- POST /api/ai/categorize/batch  (Batch transaction prediction)
- GET  /api/ai/model/status      (Model version, accuracy, training info)
- GET  /api/ai/health            (System health, latency, cache statistics)
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from prediction_service import prediction_service
from batch_service import batch_service
from health_service import HealthService

router = APIRouter(prefix="/api/ai", tags=["FinMate AI Inference Engine"])


class CategorizeRequest(BaseModel):
    merchant: str = Field(..., example="SWIGGY*PAY BANGALORE")
    merchant_alias: Optional[str] = Field(None, example="SWIGGY*PAY")
    description: Optional[str] = Field(None, example="Chicken Biryani & Coke")
    notes: Optional[str] = Field(None, example="Food order")
    category: Optional[str] = Field(None, example=None)


class BatchCategorizeRequest(BaseModel):
    transactions: List[CategorizeRequest]


@router.post("/categorize")
def categorize_single(req: CategorizeRequest):
    """Categorizes a single transaction with automatic AI inference and failsafe fallbacks."""
    try:
        return prediction_service.process_transaction(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Categorization error: {str(e)}")


@router.post("/categorize/batch")
def categorize_batch(req: BatchCategorizeRequest):
    """Categorizes a batch of transactions (1,000+ items) in parallel without reloading models."""
    try:
        items = [item.dict() for item in req.transactions]
        return batch_service.process_batch(items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch categorization error: {str(e)}")


@router.get("/model/status")
def get_model_status():
    """Gets metadata info on active model version, embedding model, accuracy, and status."""
    return HealthService.get_status()


@router.get("/health")
def get_system_health():
    """Gets real-time telemetry metrics, cache hit rate, average latency, and health status."""
    return HealthService.get_health()
