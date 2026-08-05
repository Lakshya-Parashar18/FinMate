"""
Engine.py
Core AI Financial Intelligence Engine orchestrating multi-dimensional assessment, ML score prediction,
XAI explanations, trends, projections, and personalized recommendations.
"""

from typing import Dict, Any, List, Optional
import pandas as pd

from financial_health.feature_builder import feature_builder
from financial_health.score_engine import score_engine
from financial_health.behavior_analysis import behavior_analyzer
from financial_health.budget_analysis import budget_analyzer
from financial_health.savings_analysis import savings_analyzer
from financial_health.investment_analysis import investment_analyzer
from financial_health.risk_analysis import risk_analyzer
from financial_health.trend_analysis import trend_analyzer
from financial_health.predictive_engine import predictive_engine
from financial_health.explanation_engine import explanation_engine
from financial_health.recommendation_engine import recommendation_engine
from financial_health.model_loader import health_model_loader
from ai_utils.helpers import Timer, convert_numpy_types
from ai_utils.logger import logger


class AIFinancialIntelligenceEngine:
    """Production AI Financial Intelligence Engine."""

    def __init__(self):
        self.feature_builder = feature_builder
        self.score_engine = score_engine
        self.model_loader = health_model_loader

    def evaluate_financial_health(
        self,
        transactions: List[Dict[str, Any]],
        monthly_income: float = 75000.0,
        monthly_budget: float = 50000.0,
        current_savings: float = 120000.0
    ) -> Dict[str, Any]:
        """
        Runs comprehensive financial health evaluation.
        """
        with Timer() as timer:
            # 1. Feature Engineering
            features = self.feature_builder.build_features(
                transactions=transactions,
                monthly_income=monthly_income,
                monthly_budget=monthly_budget,
                current_savings=current_savings
            )

            # 2. Compute 10 Sub-Scores & Base Composite Score
            sub_scores = self.score_engine.calculate_sub_scores(features)
            score_data = self.score_engine.calculate_overall_score(sub_scores)

            # 3. Optional ML Model Prediction Refinement
            ml_model, metadata = self.model_loader.load_model()
            if ml_model is not None:
                feature_names = metadata.get("feature_names", [])
                if feature_names:
                    row_dict = {fn: [features.get(fn, 0.0)] for fn in feature_names}
                    df_row = pd.DataFrame(row_dict)
                    ml_predicted_score = float(ml_model.predict(df_row)[0])
                    # Blend 50% rule-based composite + 50% ML predicted
                    score_data["overallScore"] = round((score_data["overallScore"] * 0.5) + (ml_predicted_score * 0.5), 2)
                    score_data["tier"] = score_engine.score_engine if hasattr(score_engine, "score_engine") else score_data["tier"]

            # 4. Dimension Analyses
            behavior = behavior_analyzer.analyze(features)
            budget = budget_analyzer.analyze(features)
            savings = savings_analyzer.analyze(features)
            investments = investment_analyzer.analyze(features)
            risk = risk_analyzer.analyze(features)
            trends = trend_analyzer.analyze_trends(features)

            # 5. Predictive Trajectory
            predictions = predictive_engine.project_health(score_data["overallScore"], trends)

            # 6. Explainable AI Insights
            explanations = explanation_engine.generate_explanations(features, sub_scores)

            # 7. Personalized Recommendations
            recommendations = recommendation_engine.generate_recommendations(features, score_data["overallScore"])

        return convert_numpy_types({
            "overallScore": score_data["overallScore"],
            "tier": score_data["tier"],
            "subScores": score_data["subScores"],
            "analyses": {
                "behavior": behavior,
                "budget": budget,
                "savings": savings,
                "investments": investments,
                "risk": risk,
                "trends": trends
            },
            "predictions": predictions,
            "explanations": explanations,
            "recommendations": recommendations,
            "telemetry": {
                "latency_ms": timer.latency_ms,
                "featuresExtractedCount": len(features),
                "modelVersion": metadata.get("version", "1.0.0") if metadata else "1.0.0"
            }
        })


financial_intelligence_engine = AIFinancialIntelligenceEngine()
