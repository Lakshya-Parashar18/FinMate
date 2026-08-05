"""
Monitoring.py
Monitoring and telemetry metrics exporter wrapper.
"""

from typing import Dict, Any
from health_service import HealthService
from metrics import metrics_tracker


class AIMonitoring:
    """Telemetry exporter for AI monitoring and alerting systems."""

    @staticmethod
    def export_metrics() -> Dict[str, Any]:
        """Returns JSON snapshot of all system health and performance metrics."""
        return HealthService.get_health()


monitoring = AIMonitoring()
