"""
Prediction.py
Inference engine providing single and high-throughput batch transaction categorization.
Calculates predictions, confidence probabilities, top-3 candidates, confidence calibration, and latency.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from preprocessing.feature_builder import FeatureBuilder
from embeddings.embedding_service import EmbeddingService
from models.model_loader import ModelLoader
from engine_utils.helpers import calibrate_confidence, Timer, convert_numpy_types
from engine_utils.logger import logger


class Predictor:
    """Production Inference Engine for Transaction Categorization."""

    def __init__(self, force_reload: bool = False):
        self.model, self.metadata = ModelLoader.load_model(force_reload=force_reload)
        self.classes = self.model.classes_
        self.embedding_model_name = self.metadata.get("embedding_model", "sentence-transformers/all-MiniLM-L6-v2")
        self.embedding_service = EmbeddingService(model_name=self.embedding_model_name)

    def predict_single(
        self,
        merchant: str,
        alias: Optional[str] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classifies a single transaction input.
        """
        with Timer() as timer:
            feature_text = FeatureBuilder.build_feature_text(merchant, alias, description, notes)
            embedding = self.embedding_service.encode(feature_text)

            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba([embedding])[0]
            else:
                pred = self.model.predict([embedding])[0]
                probs = np.zeros(len(self.classes))
                idx = list(self.classes).index(pred)
                probs[idx] = 1.0

            top_indices = np.argsort(probs)[::-1][:3]

            predicted_category = self.classes[top_indices[0]]
            confidence = float(probs[top_indices[0]])

            top_predictions = [
                {
                    "category": str(self.classes[idx]),
                    "confidence": round(float(probs[idx]), 4)
                }
                for idx in top_indices
            ]

        response = {
            "predictedCategory": predicted_category,
            "confidence": round(confidence, 4),
            "confidenceLevel": calibrate_confidence(confidence),
            "topPredictions": top_predictions,
            "latency_ms": timer.latency_ms
        }

        return convert_numpy_types(response)

    def predict_batch(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Efficiently classifies a batch of transactions (1,000+ items).
        """
        if not transactions:
            return {"predictions": [], "count": 0, "total_latency_ms": 0.0}

        with Timer() as timer:
            feature_texts = [
                FeatureBuilder.build_from_dict(txn) for txn in transactions
            ]

            embeddings = self.embedding_service.encode(feature_texts, batch_size=256)

            if hasattr(self.model, "predict_proba"):
                all_probs = self.model.predict_proba(embeddings)
            else:
                preds = self.model.predict(embeddings)
                all_probs = np.zeros((len(preds), len(self.classes)))
                for i, p in enumerate(preds):
                    all_probs[i, list(self.classes).index(p)] = 1.0

            results = []
            for i, probs in enumerate(all_probs):
                top_indices = np.argsort(probs)[::-1][:3]
                pred_cat = self.classes[top_indices[0]]
                conf = float(probs[top_indices[0]])

                top_preds = [
                    {
                        "category": str(self.classes[idx]),
                        "confidence": round(float(probs[idx]), 4)
                    }
                    for idx in top_indices
                ]

                results.append({
                    "predictedCategory": pred_cat,
                    "confidence": round(conf, 4),
                    "confidenceLevel": calibrate_confidence(conf),
                    "topPredictions": top_preds
                })

        return convert_numpy_types({
            "predictions": results,
            "count": len(results),
            "total_latency_ms": timer.latency_ms,
            "average_latency_per_item_ms": round(timer.latency_ms / len(results), 3) if results else 0.0
        })
