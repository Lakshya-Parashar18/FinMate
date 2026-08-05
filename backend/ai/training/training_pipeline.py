"""
Training_pipeline.py
Unified Platform Training Pipeline (Data Ingestion -> Embedding -> Model Training -> Validation -> ONNX Export -> Registration).
"""

from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from sklearn.model_selection import train_test_split

from config.platform_config import SYNTHETIC_CSV_PATH, DEFAULT_EMBEDDING_MODEL, SUPPORTED_CATEGORIES, MODELS_DIR
from ai_utils.logger import logger
from ai_utils.merchant_normalizer import MerchantNormalizer
from embeddings.embedding_service import platform_embedding_service
from models.model_factory import ModelFactory
from models.onnx_exporter import onnx_exporter
from registry.model_registry import platform_model_registry
from categorization.models.metrics import ModelMetrics


class UnifiedTrainingPipeline:
    """End-to-end platform training pipeline runner."""

    def __init__(self, dataset_path: Path = SYNTHETIC_CSV_PATH):
        self.dataset_path = dataset_path
        self.embedding_service = platform_embedding_service

    def run_training(self, max_samples: Optional[int] = 20000) -> Dict[str, Any]:
        logger.info(f"Starting Unified AI Platform Training on {self.dataset_path}...")
        df = pd.read_csv(self.dataset_path)

        if max_samples and len(df) > max_samples:
            df = df.sample(n=max_samples, random_state=42).reset_index(drop=True)

        df = df[df["category"].isin(SUPPORTED_CATEGORIES)].dropna(subset=["merchant", "category"])

        # 1. Feature Preprocessing
        feature_texts = []
        for _, row in df.iterrows():
            norm_m, _ = MerchantNormalizer.normalize(str(row["merchant"]))
            clean_desc = MerchantNormalizer.clean_text(str(row.get("description", "")))
            feature_texts.append(f"merchant: {norm_m.lower()} | description: {clean_desc}")

        labels = df["category"].tolist()

        # 2. Embedding Generation
        embeddings = self.embedding_service.encode_batch(feature_texts, batch_size=256)

        # 3. Train/Val Split
        X_train, X_val, y_train, y_val = train_test_split(embeddings, labels, test_size=0.2, random_state=42, stratify=labels)

        # 4. Train Candidate Classifiers & Select Best
        candidates = ["LogisticRegression", "RandomForest", "MLP"]
        best_model = None
        best_name = None
        best_metrics = None
        best_score = -1.0

        classes = sorted(list(set(labels)))

        for c_name in candidates:
            clf = ModelFactory.create_model(c_name)
            clf.fit(X_train, y_train)

            y_pred = clf.predict(X_val)
            y_prob = clf.predict_proba(X_val) if hasattr(clf, "predict_proba") else None

            metrics = ModelMetrics.evaluate_model(y_val, y_pred, y_prob, classes)
            f1 = metrics["f1_weighted"]

            if f1 > best_score:
                best_score = f1
                best_name = c_name
                best_model = clf
                best_metrics = metrics

        # 5. Export to ONNX (Optional)
        onnx_path = MODELS_DIR / "merchant_classifier.onnx"
        onnx_exporter.export_to_onnx(best_model, input_dim=384, output_path=onnx_path)

        # 6. Save & Register Model
        model_path = MODELS_DIR / "merchant_classifier.joblib"
        import joblib
        joblib.dump(best_model, model_path)

        reg_entry = platform_model_registry.register_model(
            model_id=f"merchant_classifier_v1.0.0",
            version="1.0.0",
            dataset_version="dataset_v1",
            embedding_version=DEFAULT_EMBEDDING_MODEL,
            framework=f"scikit-learn/{best_name}",
            metrics=best_metrics,
            model_path=str(model_path),
            is_active=True
        )

        logger.info(f"Platform Training Complete! Best Model: {best_name} (F1: {best_score:.4f})")
        return best_metrics


unified_training_pipeline = UnifiedTrainingPipeline()
