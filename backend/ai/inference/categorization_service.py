"""
Categorization_service.py
Core AI categorization service that processes transaction inputs and produces predictions with AI metadata.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
from model_loader import model_loader
from embedding_service import embedding_service
from merchant_service import MerchantService
from confidence_service import ConfidenceService
from metrics import metrics_tracker
from logging_service import logger


class AICategorizationService:
    """Core AI categorization inference processor."""

    def __init__(self):
        self.model_loader = model_loader
        self.embedding_service = embedding_service

    def predict_transaction(
        self,
        merchant_raw: str,
        alias_raw: Optional[str] = None,
        description_raw: Optional[str] = None,
        notes_raw: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classifies a single transaction input and attaches comprehensive AI metadata.
        """
        start_time = datetime.now()

        # 1. Merchant Normalization & Unknown Check
        normalized_merchant, is_unknown = MerchantService.normalize_merchant(merchant_raw)
        clean_alias = MerchantService.clean_text(alias_raw) if alias_raw else ""
        clean_desc = MerchantService.clean_text(description_raw) if description_raw else ""
        clean_notes = MerchantService.clean_text(notes_raw) if notes_raw else ""

        # 2. Build Semantic Feature Representation
        parts = [f"merchant: {normalized_merchant.lower()}"]
        if clean_alias:
            parts.append(f"alias: {clean_alias}")
        if clean_desc:
            parts.append(f"description: {clean_desc}")
        if clean_notes:
            parts.append(f"notes: {clean_notes}")

        feature_text = " | ".join(parts)

        # 3. Vector Embedding Lookup/Generation
        vector = self.embedding_service.get_embedding(feature_text)

        # 4. Classifier Inference
        classifier = self.model_loader.classifier
        metadata = self.model_loader.metadata
        classes = self.model_loader.classifier.classes_ if classifier and hasattr(classifier, "classes_") else []

        if classifier and hasattr(classifier, "predict_proba"):
            probs = classifier.predict_proba([vector])[0]
            top_indices = np.argsort(probs)[::-1][:3]
            predicted_category = str(classes[top_indices[0]])
            confidence = float(probs[top_indices[0]])
            top_preds = ConfidenceService.format_top_predictions(classes, probs, top_k=3)
        elif classifier:
            predicted_category = str(classifier.predict([vector])[0])
            confidence = 1.0
            top_preds = [{"category": predicted_category, "confidence": 1.0}]
        else:
            # Fallback if classifier is unavailable
            predicted_category = "Miscellaneous"
            confidence = 0.50
            top_preds = [{"category": "Miscellaneous", "confidence": 0.50}]

        # 5. Confidence Calibration & Latency Calculation
        confidence_level = ConfidenceService.calibrate_level(confidence)
        end_time = datetime.now()
        latency_ms = round((end_time - start_time).total_seconds() * 1000, 2)

        # 6. Record Performance Metrics
        metrics_tracker.record_prediction(predicted_category, confidence_level, latency_ms, is_unknown=is_unknown)

        # 7. Construct Result Payload with Optional AI Metadata
        return {
            "predictedCategory": predicted_category,
            "confidence": round(confidence, 4),
            "confidenceLevel": confidence_level,
            "topPredictions": top_preds,
            "aiMetadata": {
                "predictedCategory": predicted_category,
                "confidence": round(confidence, 4),
                "confidenceLevel": confidence_level,
                "modelVersion": metadata.get("version", "1.0.0"),
                "classifierType": metadata.get("classifier", "LogisticRegression"),
                "predictionLatency_ms": latency_ms,
                "embeddingVersion": metadata.get("embedding_model", "all-MiniLM-L6-v2"),
                "predictionTimestamp": datetime.now().isoformat(),
                "merchantNormalized": normalized_merchant,
                "isUnknownMerchant": is_unknown
            }
        }


categorization_service = AICategorizationService()
