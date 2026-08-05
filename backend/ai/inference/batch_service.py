"""
Batch_service.py
High-throughput batch transaction categorization for bank statement imports and bulk uploads.
"""

from typing import List, Dict, Any
from datetime import datetime
import numpy as np
from model_loader import model_loader
from embedding_service import embedding_service
from merchant_service import MerchantService
from confidence_service import ConfidenceService
from metrics import metrics_tracker
from logging_service import logger


class BatchInferenceService:
    """High-performance batch inference engine for 1,000+ items."""

    def __init__(self):
        self.model_loader = model_loader
        self.embedding_service = embedding_service

    def process_batch(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Classifies a list of transaction dictionaries in parallel batches without reloading models.
        """
        if not transactions:
            return {"transactions": [], "processedCount": 0, "totalLatency_ms": 0.0}

        start_time = datetime.now()

        # 1. Feature Preprocessing
        feature_texts = []
        normalized_merchants = []

        for txn in transactions:
            m_raw = txn.get("merchant", "")
            a_raw = txn.get("merchant_alias", "")
            d_raw = txn.get("description", "")
            n_raw = txn.get("notes", "")

            norm_m, is_unk = MerchantService.normalize_merchant(m_raw)
            normalized_merchants.append((norm_m, is_unk))

            clean_alias = MerchantService.clean_text(a_raw) if a_raw else ""
            clean_desc = MerchantService.clean_text(d_raw) if d_raw else ""
            clean_notes = MerchantService.clean_text(n_raw) if n_raw else ""

            parts = [f"merchant: {norm_m.lower()}"]
            if clean_alias:
                parts.append(f"alias: {clean_alias}")
            if clean_desc:
                parts.append(f"description: {clean_desc}")
            if clean_notes:
                parts.append(f"notes: {clean_notes}")

            feature_texts.append(" | ".join(parts))

        # 2. Batch Embedding Generation
        embeddings = self.embedding_service.get_batch_embeddings(feature_texts, batch_size=256)

        # 3. Batch Classifier Predict Proba
        classifier = self.model_loader.classifier
        classes = classifier.classes_ if classifier and hasattr(classifier, "classes_") else []
        metadata = self.model_loader.metadata

        if classifier and hasattr(classifier, "predict_proba"):
            all_probs = classifier.predict_proba(embeddings)
        else:
            all_probs = np.zeros((len(transactions), len(classes)))

        processed_txns = []

        for idx, txn in enumerate(transactions):
            probs = all_probs[idx]
            norm_m, is_unk = normalized_merchants[idx]

            if len(probs) > 0 and np.sum(probs) > 0:
                top_indices = np.argsort(probs)[::-1][:3]
                predicted_category = str(classes[top_indices[0]])
                confidence = float(probs[top_indices[0]])
                top_preds = ConfidenceService.format_top_predictions(classes, probs, top_k=3)
            else:
                predicted_category = "Miscellaneous"
                confidence = 0.50
                top_preds = [{"category": "Miscellaneous", "confidence": 0.50}]

            confidence_level = ConfidenceService.calibrate_level(confidence)

            # Manual user override check
            manual_cat = txn.get("category")
            final_cat = manual_cat if manual_cat and manual_cat != "Miscellaneous" else predicted_category

            processed_txns.append({
                **txn,
                "category": final_cat,
                "confidence": round(confidence, 4),
                "confidenceLevel": confidence_level,
                "topPredictions": top_preds,
                "aiMetadata": {
                    "predictedCategory": predicted_category,
                    "confidence": round(confidence, 4),
                    "confidenceLevel": confidence_level,
                    "modelVersion": metadata.get("version", "1.0.0"),
                    "merchantNormalized": norm_m,
                    "isUnknownMerchant": is_unk
                }
            })

            metrics_tracker.record_prediction(final_cat, confidence_level, 0.5, is_unknown=is_unk)

        end_time = datetime.now()
        total_latency_ms = round((end_time - start_time).total_seconds() * 1000, 2)

        return {
            "transactions": processed_txns,
            "processedCount": len(processed_txns),
            "totalLatency_ms": total_latency_ms,
            "averageLatencyPerItem_ms": round(total_latency_ms / len(processed_txns), 2) if processed_txns else 0.0
        }


batch_service = BatchInferenceService()
