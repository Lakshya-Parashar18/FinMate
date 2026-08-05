"""
Test_caching.py
Unit tests for EmbeddingStore and EmbeddingCache.
"""

import sys
import numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from embeddings.embedding_store import EmbeddingStore
from embeddings.embedding_cache import EmbeddingCache


def test_embedding_caching(tmp_path):
    db_file = tmp_path / "test_cache.db"
    store = EmbeddingStore(db_file)
    cache = EmbeddingCache(store)

    text = "merchant: swiggy | description: biryani"
    fake_vector = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)

    cache.put_batch([(text, fake_vector)], "test-model")

    retrieved = cache.get(text, "test-model")
    assert retrieved is not None
    assert np.allclose(retrieved, fake_vector)


if __name__ == "__main__":
    from pathlib import Path
    import tempfile
    test_embedding_caching(Path(tempfile.mkdtemp()))
    print("All caching tests passed!")
