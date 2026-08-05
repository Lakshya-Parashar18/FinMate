from fastapi import FastAPI, APIRouter, HTTPException, Query
from detect import evaluate_transaction_anomaly
from train import train_anomaly_model

app = FastAPI(
    title="FinMate AI Anomaly Detection Engine",
    description="Isolation Forest spending patterns anomaly detection.",
    version="1.0.0"
)

router = APIRouter(prefix="/api/ai/anomaly")

@router.get("/check")
def api_check_anomaly(
    user_id: str = Query(..., description="Unique ID of the user"),
    transaction_id: str = Query(..., description="Unique ID of the transaction")
):
    """
    Checks if a specific transaction is anomalous.
    """
    result = evaluate_transaction_anomaly(user_id, transaction_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/train")
def api_train_model(user_id: str = Query(..., description="Unique ID of the user")):
    """
    Triggers Isolation Forest model retraining for the user.
    """
    success = train_anomaly_model(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Model retraining failed")
    return {"status": "success", "message": "Anomaly model retrained successfully"}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI anomaly server on http://localhost:8001")
    uvicorn.run("routes:app", host="127.0.0.1", port=8001, reload=True)
