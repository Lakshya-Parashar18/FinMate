"""
Retraining_service.py
Automated retraining service that merges feedback, trains candidate classifiers,
evaluates against production model, and deploys if criteria are met.
"""

from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import pandas as pd
from learning.dataset_manager import dataset_manager
from learning.evaluation import ModelComparisonEvaluator
from learning.deployment import deployment_manager
from learning.versioning import version_manager
from learning.model_registry import learning_registry

from categorization.models.training import TrainingPipeline
from categorization.models.model_loader import ModelLoader
from categorization.engine_utils.logger import logger


class RetrainingService:
    """End-to-end MLOps Retraining & Continuous Deployment Orchestrator."""

    def __init__(self):
        self.dataset_manager = dataset_manager
        self.version_manager = version_manager

    def execute_retraining(self, force_deploy: bool = False) -> Dict[str, Any]:
        """
        Executes retraining pipeline: Merge -> Train -> Benchmark vs Prod -> Deploy/Discard.
        """
        logger.info("=" * 70)
        logger.info("STARTING CONTINUOUS LEARNING RETRAINING PIPELINE...")
        logger.info("=" * 70)

        # 1. Merge datasets
        merged_df, merge_stats = self.dataset_manager.merge_datasets()

        # 2. Get Current Model Metrics
        try:
            _, current_metadata = ModelLoader.load_model()
            current_f1 = current_metadata.get("f1_weighted", 0.0)
            current_version = current_metadata.get("version", "v1.0.0")
        except Exception:
            current_metadata = {"f1_weighted": 0.0, "top3_accuracy": 0.0, "version": "v1.0.0"}
            current_f1 = 0.0
            current_version = "v1.0.0"

        # 3. Run Training Pipeline on Merged Data
        pipeline = TrainingPipeline(dataset_path=self.dataset_manager.output_path)
        candidate_metrics = pipeline.run_pipeline()

        # 4. Benchmark Candidate vs Current Deployed Model
        should_deploy, eval_reason = ModelComparisonEvaluator.compare_models(
            current_metrics=current_metadata,
            candidate_metrics=candidate_metrics
        )

        next_version = self.version_manager.get_next_version(current_version)

        deployment_status = "DISCARDED"
        if should_deploy or force_deploy:
            deployed_ok, deploy_msg = deployment_manager.deploy_new_version(
                version_tag=next_version,
                new_model_path=pipeline.registry.models_dir / "merchant_classifier.joblib",
                new_metadata_path=pipeline.registry.models_dir / "classifier_metadata.json",
                metadata={**candidate_metrics, "version": next_version}
            )
            if deployed_ok:
                deployment_status = "DEPLOYED"
        else:
            logger.info(f"Retrained model discarded. Production model '{current_version}' retained.")

        result_summary = {
            "status": "SUCCESS",
            "deploymentStatus": deployment_status,
            "previousVersion": current_version,
            "candidateVersion": next_version,
            "evalReason": eval_reason,
            "mergeStats": merge_stats,
            "candidateMetrics": {
                "accuracy": candidate_metrics.get("accuracy", 0.0),
                "top3Accuracy": candidate_metrics.get("top3_accuracy", 0.0),
                "f1Weighted": candidate_metrics.get("f1_weighted", 0.0)
            }
        }

        logger.info(f"RETRAINING PIPELINE FINISHED. Result: {deployment_status}")
        return result_summary


retraining_service = RetrainingService()
