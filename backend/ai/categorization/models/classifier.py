"""
Classifier.py
Factory for instantiation of ML and Neural Network classifiers.
Supports LogisticRegression, RandomForest, and MLP (Neural Network).
"""

from typing import Any
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from engine_utils.logger import logger


class ClassifierFactory:
    """Factory for creating configurable scikit-learn and neural network classifiers."""

    SUPPORTED_CLASSIFIERS = ["LogisticRegression", "RandomForest", "MLP"]

    @staticmethod
    def create_classifier(classifier_type: str = "LogisticRegression", **kwargs) -> Any:
        """
        Creates and returns a machine learning or neural network classifier.
        """
        if classifier_type == "LogisticRegression":
            params = {"max_iter": 500, "C": 1.0, "solver": "lbfgs", "random_state": 42}
            params.update(kwargs)
            return LogisticRegression(**params)

        elif classifier_type == "RandomForest":
            params = {"n_estimators": 50, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return RandomForestClassifier(**params)

        elif classifier_type == "MLP":
            params = {"hidden_layer_sizes": (128, 64), "activation": "relu", "max_iter": 150, "random_state": 42}
            params.update(kwargs)
            return MLPClassifier(**params)

        else:
            logger.error(f"Unsupported classifier type: {classifier_type}")
            raise ValueError(f"Classifier '{classifier_type}' is not supported. Choose from {ClassifierFactory.SUPPORTED_CLASSIFIERS}")
