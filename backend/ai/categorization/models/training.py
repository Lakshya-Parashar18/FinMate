"""
Training.py
Complete training pipeline for the AI Transaction Categorization Engine.
Loads synthetic dataset, cleans text, generates transformer embeddings,
trains candidate classifiers, evaluates metrics, and registers the best model.
"""

from pathlib import Path
from typing import Optional, List, Dict
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

from engine_utils.config import DATASET_CSV_PATH, DEFAULT_EMBEDDING_MODEL, TEST_SIZE, RANDOM_STATE, SUPPORTED_CATEGORIES
from engine_utils.logger import logger
from preprocessing.feature_builder import FeatureBuilder
from embeddings.embedding_service import EmbeddingService
from models.classifier import ClassifierFactory
from models.evaluation import Evaluator
from models.model_registry import ModelRegistry


class TrainingPipeline:
    """End-to-end training pipeline runner."""

    def __init__(self, dataset_path: Path = DATASET_CSV_PATH, embedding_model_name: str = DEFAULT_EMBEDDING_MODEL):
        self.dataset_path = dataset_path
        self.embedding_model_name = embedding_model_name
        self.embedding_service = EmbeddingService(model_name=self.embedding_model_name)
        self.evaluator = Evaluator()
        self.registry = ModelRegistry()

    def run_pipeline(self, max_samples: Optional[int] = None) -> Dict:
        """
        Runs the full model training and evaluation lifecycle.
        """
        logger.info(f"Loading dataset from {self.dataset_path}...")
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset CSV not found at {self.dataset_path}. Please run dataset generator first.")

        df = pd.read_csv(self.dataset_path)

        if max_samples and len(df) > max_samples:
            logger.info(f"Subsampling dataset to {max_samples:,} rows for training...")
            df = df.sample(n=max_samples, random_state=RANDOM_STATE).reset_index(drop=True)

        # Filter strictly allowed categories
        df = df[df["category"].isin(SUPPORTED_CATEGORIES)].dropna(subset=["merchant", "category"])
        logger.info(f"Dataset loaded with {len(df):,} valid rows across {df['category'].nunique()} categories.")

        # 1. Feature Preprocessing
        logger.info("Building semantic text representation for each transaction...")
        texts = [
            FeatureBuilder.build_from_dict(row.to_dict())
            for _, row in df.iterrows()
        ]
        labels = df["category"].tolist()

        # 2. Embedding Generation
        logger.info("Generating Transformer embeddings (using sentence-transformers & SQLite cache)...")
        embeddings = self.embedding_service.encode(texts, batch_size=256)

        # 3. Train/Validation Split
        X_train, X_val, y_train, y_val = train_test_split(
            embeddings, labels, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=labels
        )
        logger.info(f"Data split into {len(X_train):,} training and {len(X_val):,} validation samples.")

        # 4. Train Candidate Classifiers
        candidate_names = ClassifierFactory.SUPPORTED_CLASSIFIERS
        trained_candidates = {}

        for name in candidate_names:
            logger.info(f"Training candidate classifier: {name}...")
            clf = ClassifierFactory.create_classifier(name)
            clf.fit(X_train, y_train)
            trained_candidates[name] = clf

        # 5. Evaluate and Select Best Model
        classes = sorted(list(set(labels)))
        best_name, best_model, best_metrics = self.evaluator.evaluate_candidates(
            trained_candidates, X_val, y_val, classes
        )

        # 6. Save Best Model and Metadata
        self.registry.register_model(
            model_instance=best_model,
            classifier_type=best_name,
            embedding_model_name=self.embedding_model_name,
            metrics=best_metrics,
            num_samples=len(df),
            version="1.0.0"
        )

        logger.info("=" * 70)
        logger.info(f"TRAINING COMPLETE! Best Model: {best_name} (F1: {best_metrics['f1_weighted']:.4f})")
        logger.info("=" * 70)

        return best_metrics
