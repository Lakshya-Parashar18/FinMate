"""
Model_factory.py
Model factory instantiating machine learning and deep learning classifier models.
"""

from typing import Any
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from ai_utils.logger import logger


class ModelFactory:
    """Factory for creating configurable ML and DL classifiers."""

    SUPPORTED_CLASSIFIERS = ["LogisticRegression", "RandomForest", "MLP"]

    @staticmethod
    def create_model(model_type: str = "MLP", **kwargs) -> Any:
        if model_type == "LogisticRegression":
            params = {"max_iter": 500, "C": 1.0, "solver": "lbfgs", "random_state": 42}
            params.update(kwargs)
            return LogisticRegression(**params)

        elif model_type == "RandomForest":
            params = {"n_estimators": 50, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return RandomForestClassifier(**params)

        elif model_type == "MLP":
            params = {"hidden_layer_sizes": (128, 64), "activation": "relu", "max_iter": 150, "random_state": 42}
            params.update(kwargs)
            return MLPClassifier(**params)

        else:
            raise ValueError(f"Unsupported model type '{model_type}'. Choose from {ModelFactory.SUPPORTED_CLASSIFIERS}")
