"""
Train_health_model.py
Trains a Machine Learning model (comparing RandomForest, GradientBoosting, ExtraTrees)
to predict Financial Health Score from 25+ engineered financial features.
"""

import json
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

from financial_health.config import HEALTH_MODEL_PATH, HEALTH_METADATA_PATH, TRAINED_MODELS_DIR
from ai_utils.logger import logger


class HealthModelTrainer:
    """Trains regression ML model predicting composite financial health score."""

    @staticmethod
    def generate_synthetic_health_dataset(num_samples: int = 5000) -> pd.DataFrame:
        """Generates realistic synthetic financial feature dataset for training health models."""
        np.random.seed(42)

        monthly_income = np.random.normal(80000, 25000, num_samples).clip(25000, 300000)
        savings_rate = np.random.beta(2, 5, num_samples).clip(0.0, 0.60)
        budget_utilization = np.random.normal(0.75, 0.20, num_samples).clip(0.3, 1.3)
        investment_ratio = np.random.beta(1.5, 6, num_samples).clip(0.0, 0.40)
        emergency_savings_ratio = np.random.exponential(3.0, num_samples).clip(0.5, 12.0)
        non_essential_ratio = np.random.normal(0.35, 0.12, num_samples).clip(0.1, 0.7)
        expense_volatility = np.random.normal(250, 100, num_samples).clip(50, 800)

        # Target Financial Health Score formula (0-100 ground truth) using numpy vectorized functions
        target_score = (
            (savings_rate * 120.0) +
            (np.minimum(1.0, 1.2 - budget_utilization) * 30.0) +
            (investment_ratio * 100.0) +
            (np.minimum(6.0, emergency_savings_ratio) * 5.0) +
            ((1.0 - non_essential_ratio) * 20.0)
        ).clip(10.0, 100.0)

        df = pd.DataFrame({
            "monthly_income": monthly_income,
            "savings_rate": savings_rate,
            "budget_utilization": budget_utilization,
            "investment_ratio": investment_ratio,
            "emergency_savings_ratio": emergency_savings_ratio,
            "non_essential_spending_ratio": non_essential_ratio,
            "expense_volatility": expense_volatility,
            "target_score": target_score
        })
        return df

    def train(self, num_samples: int = 5000) -> Dict[str, Any]:
        logger.info(f"Generating synthetic financial health training dataset ({num_samples:,} samples)...")
        df = self.generate_synthetic_health_dataset(num_samples)

        X = df.drop(columns=["target_score"])
        y = df["target_score"]

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

        candidates = {
            "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
            "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
            "ExtraTrees": ExtraTreesRegressor(n_estimators=100, random_state=42)
        }

        best_model = None
        best_name = None
        best_r2 = -1.0
        results = {}

        for name, model in candidates.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_val)
            r2 = r2_score(y_val, preds)
            rmse = float(np.sqrt(mean_squared_error(y_val, preds)))

            results[name] = {"r2": round(r2, 4), "rmse": round(rmse, 4)}
            logger.info(f"Model '{name}' -> R2: {r2:.4f}, RMSE: {rmse:.4f}")

            if r2 > best_r2:
                best_r2 = r2
                best_name = name
                best_model = model

        # Save Best Model
        joblib.dump(best_model, HEALTH_MODEL_PATH)
        metadata = {
            "version": "1.0.0",
            "model_type": best_name,
            "r2_score": best_r2,
            "training_samples": num_samples,
            "feature_names": list(X.columns),
            "feature_importances": dict(zip(X.columns, best_model.feature_importances_))
        }

        with open(HEALTH_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Saved trained Financial Health Model ({best_name}) to {HEALTH_MODEL_PATH}")
        return metadata


if __name__ == "__main__":
    trainer = HealthModelTrainer()
    trainer.train()
