"""
Embeddings Package
"""

import sys
from pathlib import Path

_pkg_root = str(Path(__file__).resolve().parent.parent)
if _pkg_root not in sys.path:
    sys.path.insert(0, _pkg_root)

from .embedding_service import EmbeddingService
from .embedding_cache import EmbeddingCache
from .embedding_store import EmbeddingStore

__all__ = ["EmbeddingService", "EmbeddingCache", "EmbeddingStore"]
