"""
Routes.py
FastAPI router endpoints for AI transaction categorization.
Endpoints:
- POST /api/v1/categorize
- POST /api/v1/categorize/batch
- GET /api/v1/categorize/model-info
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from api.services import CategorizationService

router = APIRouter(prefix="/api/v1/categorize", tags=["AI Categorization"])
service = CategorizationService()


class TransactionCategorizeRequest(BaseModel):
    merchant: str = Field(..., example="SWIGGY*PAY BANGALORE")
    merchant_alias: Optional[str] = Field(None, example="SWIGGY*PAY")
    description: Optional[str] = Field(None, example="Chicken Biryani & Coke")
    notes: Optional[str] = Field(None, example="Food order")


class BatchCategorizeRequest(BaseModel):
    transactions: List[TransactionCategorizeRequest]


@router.post("")
def categorize_transaction(req: TransactionCategorizeRequest):
    """Categorizes a single financial transaction."""
    try:
        return service.categorize_single(
            merchant=req.merchant,
            alias=req.merchant_alias,
            description=req.description,
            notes=req.notes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
def categorize_batch_transactions(req: BatchCategorizeRequest):
    """Categorizes a batch of financial transactions."""
    try:
        raw_txns = [item.dict() for item in req.transactions]
        return service.categorize_batch(raw_txns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
def get_model_info():
    """Gets metadata info about the active AI categorization model."""
    return service.get_active_model_info()
