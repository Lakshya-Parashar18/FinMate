"""
Metrics_collector.py
Thread-safe metrics telemetry collector for platform performance monitoring.
"""

from learning.quality_monitor import quality_monitor
from inference.metrics import metrics_tracker


class PlatformMetricsCollector:
    """Telemetry collector gathering system metrics across AI services."""

    @staticmethod
    def get_metrics_snapshot():
        metrics_summary = metrics_tracker.get_summary()
        quality_summary = quality_monitor.get_quality_metrics()

        return {
            "inferenceMetrics": metrics_summary,
            "qualityMetrics": quality_summary
        }


platform_metrics_collector = PlatformMetricsCollector()
