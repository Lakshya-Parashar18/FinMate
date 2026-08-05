"""
Learning_routes.py
Production FastAPI router for Continuous Learning & MLOps lifecycle management.

Endpoints:
- POST /api/ai/feedback       (Submit user correction feedback)
- POST /api/ai/retrain        (Trigger automated model retraining)
- POST /api/ai/rollback       (Rollback to previous model version)
- GET  /api/ai/models         (List model history & registry)
- GET  /api/ai/model/latest   (Get active deployed version)
- GET  /api/ai/model/history  (Get deployment history)
- GET  /api/ai/analytics      (Get MLOps analytics dashboard report)
- GET  /api/ai/drift          (Get data drift status)
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from feedback_service import feedback_service
from retraining_service import retraining_service
from rollback import rollback_manager
from model_registry import learning_registry
from analytics import analytics_engine
from drift_detection import drift_detector

router = APIRouter(prefix="/api/ai", tags=["FinMate MLOps & Continuous Learning"])


class FeedbackRequest(BaseModel):
    merchant: str = Field(..., example="Swiggy")
    correct_category: str = Field(..., example="Groceries")
    merchant_alias: Optional[str] = Field(None, example="SWIGGY INSTAMART")
    description: Optional[str] = Field(None, example="Milk & Eggs")
    amount: Optional[float] = Field(0.0, example=150.0)
    original_prediction: Optional[str] = Field("Food & Dining", example="Food & Dining")
    confidence: Optional[float] = Field(0.85, example=0.85)
    model_version: Optional[str] = Field("v1.0.0", example="v1.0.0")
    user_persona: Optional[str] = Field("Student", example="Student")


class RollbackRequest(BaseModel):
    version: str = Field(..., example="v1.0.0")
    reason: Optional[str] = Field("Manual Rollback", example="Performance degradation")


class RetrainRequest(BaseModel):
    force: Optional[bool] = Field(False, example=False)


@router.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    """Submits real user categorization feedback to continuously train the AI."""
    try:
        return feedback_service.record_feedback(
            merchant=req.merchant,
            correct_category=req.correct_category,
            merchant_alias=req.merchant_alias,
            description=req.description,
            amount=req.amount,
            original_prediction=req.original_prediction,
            confidence=req.confidence,
            model_version=req.model_version,
            user_persona=req.user_persona
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain")
def trigger_retraining(req: RetrainRequest = RetrainRequest()):
    """Triggers dataset merging, model retraining, benchmarking, and safe deployment."""
    try:
        return retraining_service.execute_retraining(force_deploy=req.force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rollback")
def rollback_model(req: RollbackRequest):
    """Rolls back production AI model to any previously archived version."""
    success, msg = rollback_manager.rollback_to_version(req.version, req.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg}


@router.get("/models")
@router.get("/model/history")
def get_model_history():
    """Gets MLOps model registry history, deployments, and rollbacks."""
    return learning_registry.get_full_history()


@router.get("/model/latest")
def get_latest_model():
    """Gets currently active deployed model version."""
    return {"active_version": learning_registry.get_active_version()}


@router.get("/analytics")
def get_mlops_analytics():
    """Gets MLOps analytics dashboard report."""
    return analytics_engine.generate_full_report()


@router.get("/drift")
def get_data_drift():
    """Gets category & merchant data drift status."""
    baseline = {"Food & Dining": 0.25, "Groceries": 0.20, "Transportation": 0.15, "Shopping": 0.15, "Rent & Housing": 0.10, "Utilities": 0.15}
    recent = {"Food & Dining": 0.28, "Groceries": 0.22, "Transportation": 0.12, "Shopping": 0.18, "Rent & Housing": 0.08, "Utilities": 0.12}
    return drift_detector.detect_category_drift(baseline, recent)
