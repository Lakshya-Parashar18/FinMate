"""
API Package
"""

import sys
from pathlib import Path

_pkg_root = str(Path(__file__).resolve().parent.parent)
if _pkg_root not in sys.path:
    sys.path.insert(0, _pkg_root)

from .routes import router
from .services import CategorizationService

__all__ = ["router", "CategorizationService"]
