"""
Test_financial_health.py
Unit tests for Financial Intelligence Engine: Model training, Feature extraction, Score engine, Sub-scores, XAI, and Recommendations.
"""

import sys
from pathlib import Path

# Add backend/ai to sys.path
AI_DIR = Path(__file__).resolve().parent.parent.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from financial_health.train_health_model import HealthModelTrainer
from financial_health.engine import financial_intelligence_engine
from gateway.ai_gateway import ai_gateway


def test_model_training():
    trainer = HealthModelTrainer()
    meta = trainer.train(num_samples=1000)
    assert meta["r2_score"] > 0.85
    assert "feature_importances" in meta


def test_health_evaluation():
    sample_txns = [
        {"merchant": "Swiggy", "amount": 450, "category": "Food & Dining"},
        {"merchant": "Uber", "amount": 280, "category": "Transportation"},
        {"merchant": "Zerodha", "amount": 5000, "category": "Investments"},
        {"merchant": "D-Mart", "amount": 3200, "category": "Groceries"}
    ]

    res = financial_intelligence_engine.evaluate_financial_health(
        transactions=sample_txns,
        monthly_income=85000.0,
        monthly_budget=55000.0,
        current_savings=150000.0
    )

    assert "overallScore" in res
    assert 0.0 <= res["overallScore"] <= 100.0
    assert "subScores" in res
    assert len(res["subScores"]) == 10
    assert "predictions" in res
    assert "explanations" in res
    assert "recommendations" in res


def test_gateway_integration():
    res = ai_gateway.get_financial_health_score()
    assert "overallScore" in res
    assert "tier" in res


if __name__ == "__main__":
    test_model_training()
    test_health_evaluation()
    test_gateway_integration()
    print("All AI Financial Intelligence Engine unit tests passed successfully!")
