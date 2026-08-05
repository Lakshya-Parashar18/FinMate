"""
Inference_engine.py
Unified Platform Inference Engine with configurable Native (Joblib) & ONNX backends.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import joblib
from config.platform_config import MODELS_DIR, DEFAULT_EMBEDDING_MODEL, ENABLE_ONNX_INFERENCE, CONFIDENCE_THRESHOLDS
from ai_utils.logger import logger
from ai_utils.helpers import Timer, convert_numpy_types
from ai_utils.merchant_normalizer import MerchantNormalizer
from embeddings.embedding_service import platform_embedding_service
from registry.model_registry import platform_model_registry


class PlatformInferenceEngine:
    """Production AI Platform Inference Engine."""

    def __init__(self):
        self.embedding_service = platform_embedding_service
        self._model = None
        self._classes = []
        self._load_model()

    def _load_model(self):
        model_path = MODELS_DIR / "merchant_classifier.joblib"
        if not model_path.exists():
            model_path = Path(__file__).resolve().parent.parent / "categorization" / "trained_models" / "merchant_classifier.joblib"

        if model_path.exists():
            logger.info(f"Loading Platform Classifier Model from {model_path}...")
            self._model = joblib.load(model_path)
            self._classes = self._model.classes_ if hasattr(self._model, "classes_") else []
        else:
            logger.warning(f"No trained classifier joblib found at {model_path}.")

    def calibrate_confidence(self, prob: float) -> str:
        if prob >= CONFIDENCE_THRESHOLDS["HIGH"]:
            return "HIGH"
        elif prob >= CONFIDENCE_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        else:
            return "LOW"

    def predict_single(
        self,
        merchant_raw: str,
        alias_raw: Optional[str] = None,
        description_raw: Optional[str] = None,
        notes_raw: Optional[str] = None
    ) -> Dict[str, Any]:
        """Runs single transaction prediction through central embedding & classifier services."""
        with Timer() as timer:
            norm_m, is_unk = MerchantNormalizer.normalize(merchant_raw)
            clean_alias = MerchantNormalizer.clean_text(alias_raw) if alias_raw else ""
            clean_desc = MerchantNormalizer.clean_text(description_raw) if description_raw else ""
            clean_notes = MerchantNormalizer.clean_text(notes_raw) if notes_raw else ""

            parts = [f"merchant: {norm_m.lower()}"]
            if clean_alias:
                parts.append(f"alias: {clean_alias}")
            if clean_desc:
                parts.append(f"description: {clean_desc}")
            if clean_notes:
                parts.append(f"notes: {clean_notes}")

            feature_text = " | ".join(parts)
            vector = self.embedding_service.encode_single(feature_text)

            if self._model and hasattr(self._model, "predict_proba"):
                probs = self._model.predict_proba([vector])[0]
                top_indices = np.argsort(probs)[::-1][:3]
                pred_cat = str(self._classes[top_indices[0]])
                conf = float(probs[top_indices[0]])
                top_preds = [
                    {"category": str(self._classes[idx]), "confidence": round(float(probs[idx]), 4)}
                    for idx in top_indices
                ]
            elif self._model:
                pred_cat = str(self._model.predict([vector])[0])
                conf = 1.0
                top_preds = [{"category": pred_cat, "confidence": 1.0}]
            else:
                pred_cat = "Miscellaneous"
                conf = 0.50
                top_preds = [{"category": "Miscellaneous", "confidence": 0.50}]

            conf_level = self.calibrate_confidence(conf)

        return convert_numpy_types({
            "predictedCategory": pred_cat,
            "confidence": round(conf, 4),
            "confidenceLevel": conf_level,
            "topPredictions": top_preds,
            "aiMetadata": {
                "predictedCategory": pred_cat,
                "confidence": round(conf, 4),
                "confidenceLevel": conf_level,
                "modelVersion": "1.0.0",
                "predictionLatency_ms": timer.latency_ms,
                "predictionTimestamp": datetime.now().isoformat(),
                "merchantNormalized": norm_m,
                "isUnknownMerchant": is_unk
            }
        })


platform_inference_engine = PlatformInferenceEngine()
