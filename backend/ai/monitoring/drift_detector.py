"""
Drift_detector.py
Monitors category and merchant distribution drift across incoming transaction windows.
"""

from learning.drift_detection import drift_detector


class PlatformDriftDetector:
    """Monitors data drift across category and merchant distributions."""

    @staticmethod
    def check_drift():
        baseline = {"Food & Dining": 0.25, "Groceries": 0.20, "Transportation": 0.15, "Shopping": 0.15, "Rent & Housing": 0.10, "Utilities": 0.15}
        recent = {"Food & Dining": 0.28, "Groceries": 0.22, "Transportation": 0.12, "Shopping": 0.18, "Rent & Housing": 0.08, "Utilities": 0.12}
        return drift_detector.detect_category_drift(baseline, recent)


platform_drift_detector = PlatformDriftDetector()
