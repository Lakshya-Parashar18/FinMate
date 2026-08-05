"""
Metrics.py
Thread-safe telemetry metrics counter for tracking AI inference performance,
latency, cache hit ratios, confidence distributions, and fallback events.
"""

import threading
from typing import Dict, Any
from collections import Counter


class InferenceMetricsTracker:
    """Thread-safe runtime performance and monitoring metrics store."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(InferenceMetricsTracker, cls).__new__(cls)
                cls._instance._init_metrics()
            return cls._instance

    def _init_metrics(self):
        self.prediction_count = 0
        self.total_latency_ms = 0.0
        self.cache_hits = 0
        self.cache_misses = 0
        self.unknown_merchants_count = 0
        self.fallback_count = 0
        self.errors_count = 0
        self.confidence_levels = Counter({"HIGH": 0, "MEDIUM": 0, "LOW": 0})
        self.category_counts = Counter()

    def record_prediction(self, category: str, confidence_level: str, latency_ms: float, is_unknown: bool = False):
        with self._lock:
            self.prediction_count += 1
            self.total_latency_ms += latency_ms
            self.confidence_levels[confidence_level] += 1
            self.category_counts[category] += 1
            if is_unknown:
                self.unknown_merchants_count += 1

    def record_cache_hit(self):
        with self._lock:
            self.cache_hits += 1

    def record_cache_miss(self):
        with self._lock:
            self.cache_misses += 1

    def record_fallback(self):
        with self._lock:
            self.fallback_count += 1

    def record_error(self):
        with self._lock:
            self.errors_count += 1

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            total_cache_reqs = self.cache_hits + self.cache_misses
            cache_hit_rate = round((self.cache_hits / total_cache_reqs) * 100, 2) if total_cache_reqs > 0 else 0.0
            avg_latency = round(self.total_latency_ms / self.prediction_count, 2) if self.prediction_count > 0 else 0.0

            return {
                "predictionCount": self.prediction_count,
                "averageLatency_ms": avg_latency,
                "totalLatency_ms": round(self.total_latency_ms, 2),
                "cacheHits": self.cache_hits,
                "cacheMisses": self.cache_misses,
                "cacheHitRatePercent": cache_hit_rate,
                "unknownMerchantCount": self.unknown_merchants_count,
                "fallbackCount": self.fallback_count,
                "errorCount": self.errors_count,
                "confidenceDistribution": dict(self.confidence_levels),
                "topPredictedCategories": dict(self.category_counts.most_common(5))
            }


metrics_tracker = InferenceMetricsTracker()
