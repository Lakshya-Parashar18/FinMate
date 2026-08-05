"""
Api_router.py
Central FastAPI API router for the FinMate AI Platform.
Routes all requests through the Central AI Gateway.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from gateway.ai_gateway import ai_gateway

router = APIRouter(prefix="/api/ai", tags=["FinMate Central AI Gateway"])


class SingleCategorizePayload(BaseModel):
    merchant: str = Field(..., example="Swiggy")
    merchant_alias: Optional[str] = Field(None, example="SWIGGY INSTAMART")
    description: Optional[str] = Field(None, example="Biryani & Drinks")
    notes: Optional[str] = Field(None, example="Dinner")
    category: Optional[str] = Field(None, example=None)


class BatchCategorizePayload(BaseModel):
    transactions: List[SingleCategorizePayload]


@router.post("/gateway/categorize")
@router.post("/categorize")
def categorize(payload: SingleCategorizePayload):
    """Categorizes a transaction via Central AI Gateway."""
    return ai_gateway.categorize_transaction(
        merchant=payload.merchant,
        alias=payload.merchant_alias,
        description=payload.description,
        notes=payload.notes,
        category=payload.category
    )


@router.post("/gateway/categorize/batch")
@router.post("/categorize/batch")
def batch_categorize(payload: BatchCategorizePayload):
    """Batch categorizes transactions via Central AI Gateway."""
    items = [t.dict() for t in payload.transactions]
    return ai_gateway.batch_categorize(items)


@router.get("/gateway/status")
@router.get("/model/status")
@router.get("/health")
def get_status():
    """Gets platform status, active model version, and telemetry."""
    return ai_gateway.get_platform_status()
