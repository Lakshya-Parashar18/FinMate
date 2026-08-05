"""
Categorization Root Package
"""

import sys
from pathlib import Path

# Ensure root categorization directory is on sys.path
_pkg_root = str(Path(__file__).resolve().parent)
if _pkg_root not in sys.path:
    sys.path.insert(0, _pkg_root)
