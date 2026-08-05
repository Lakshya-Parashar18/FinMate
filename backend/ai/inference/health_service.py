"""
Health_service.py
Health inspection and status reporting service for AI engine endpoints.
"""

from typing import Dict, Any
from model_loader import model_loader
from metrics import metrics_tracker
from cache_service import cache_service


class HealthService:
    """Service for retrieving system health, status, and performance telemetry."""

    @staticmethod
    def get_status() -> Dict[str, Any]:
        """Returns model version, classifier, accuracy, status."""
        metadata = model_loader.metadata
        is_loaded = model_loader.is_model_loaded

        return {
            "status": "HEALTHY" if is_loaded else "DEGRADED",
            "modelLoaded": is_loaded,
            "modelVersion": metadata.get("version", "1.0.0"),
            "embeddingModel": metadata.get("embedding_model", "sentence-transformers/all-MiniLM-L6-v2"),
            "classifier": metadata.get("classifier", "LogisticRegression"),
            "trainingDate": metadata.get("training_date", "N/A"),
            "accuracy": metadata.get("accuracy", 0.0),
            "top3Accuracy": metadata.get("top3_accuracy", 0.0),
            "f1Score": metadata.get("f1_weighted", 0.0),
            "numberOfClasses": len(metadata.get("categories", []))
        }

    @staticmethod
    def get_health() -> Dict[str, Any]:
        """Returns health metrics, cache hit rates, average latency, and prediction counts."""
        summary = metrics_tracker.get_summary()
        status_info = HealthService.get_status()

        return {
            "health": status_info["status"],
            "modelStatus": status_info,
            "cache": {
                "hits": summary["cacheHits"],
                "misses": summary["cacheMisses"],
                "hitRatePercent": summary["cacheHitRatePercent"]
            },
            "metrics": {
                "predictionCount": summary["predictionCount"],
                "averageLatency_ms": summary["averageLatency_ms"],
                "unknownMerchantsCount": summary["unknownMerchantCount"],
                "fallbackCount": summary["fallbackCount"],
                "errorCount": summary["errorCount"],
                "confidenceDistribution": summary["confidenceDistribution"]
            }
        }
