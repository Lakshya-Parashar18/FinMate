from fastapi import FastAPI, APIRouter, HTTPException, Query
from predict import get_forecast
from train import train_user_model

app = FastAPI(
    title="FinMate ML Forecasting Engine",
    description="Production-ready XGBoost monthly spending forecasting engine.",
    version="1.0.0"
)

router = APIRouter(prefix="/api/ai")

@router.get("/forecast")
def api_get_forecast(user_id: str = Query(..., description="The unique ID of the user")):
    """
    Get the spending forecast for the current month.
    If the model hasn't been trained for this user, it trains one automatically.
    """
    result = get_forecast(user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/train")
def api_train_model(user_id: str = Query(..., description="The unique ID of the user")):
    """
    Manually triggers model retraining for the user.
    """
    success = train_user_model(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to retrain model")
    return {"status": "success", "message": "XGBoost model retrained successfully"}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI dev server on http://localhost:8000")
    uvicorn.run("routes:app", host="127.0.0.1", port=8000, reload=True)
