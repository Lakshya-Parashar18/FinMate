"""
Health_inspector.py
Evaluates AI platform health and returns telemetry snapshots.
"""

from typing import Dict, Any
from registry.model_registry import platform_model_registry
from monitoring.metrics_collector import platform_metrics_collector


class PlatformHealthInspector:
    """Evaluates and reports platform health status."""

    @staticmethod
    def inspect_health() -> Dict[str, Any]:
        active_meta = platform_model_registry.get_active_model_metadata() or {}
        telemetry = platform_metrics_collector.get_metrics_snapshot()

        return {
            "status": "HEALTHY",
            "activeModel": active_meta,
            "telemetry": telemetry
        }


platform_health_inspector = PlatformHealthInspector()
