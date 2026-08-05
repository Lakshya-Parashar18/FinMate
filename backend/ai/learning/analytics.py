"""
Analytics.py
Generates JSON reports summarizing AI lifecycle, model performance, feedback growth, and dataset analytics.
"""

import json
from pathlib import Path
from typing import Dict, Any
from learning.learning_config import ANALYTICS_REPORTS_DIR
from learning.model_registry import learning_registry
from learning.quality_monitor import quality_monitor


class AIAnalyticsEngine:
    """Generates backend JSON analytics reports for MLOps dashboards."""

    def __init__(self, reports_dir: Path = ANALYTICS_REPORTS_DIR):
        self.reports_dir = reports_dir
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_full_report(self) -> Dict[str, Any]:
        registry_history = learning_registry.get_full_history()
        quality_data = quality_monitor.get_quality_metrics()

        report = {
            "activeVersion": registry_history.get("active_version", "v1.0.0"),
            "totalDeployments": len(registry_history.get("deployments", [])),
            "totalRollbacks": len(registry_history.get("rollbacks", [])),
            "quality": quality_data,
            "history": registry_history.get("history", [])
        }

        report_file = self.reports_dir / "mlops_analytics_report.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        return report


analytics_engine = AIAnalyticsEngine()
