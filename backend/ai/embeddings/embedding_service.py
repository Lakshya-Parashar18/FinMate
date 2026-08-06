"""
Embedding_service.py
Centralized embedding service serving vector representations across all AI platform modules.
ONNX Optimized fallback for low-RAM server environments (e.g. Render Free Tier).
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Union
import numpy as np
from embeddings.embedding_store import embedding_store
from config.platform_config import DEFAULT_EMBEDDING_MODEL, MAX_RAM_CACHE_ENTRIES, ENABLE_ONNX_INFERENCE
from ai_utils.logger import logger

# Try loading PyTorch backend; if it fails (not installed), fallback to ONNX.
try:
    if ENABLE_ONNX_INFERENCE:
        raise ImportError("ONNX inference requested via config.")
    from sentence_transformers import SentenceTransformer
    HAS_PYTORCH = True
    logger.info("Using PyTorch backend for embedding service.")
except ImportError:
    HAS_PYTORCH = False
    logger.info("Using ONNX Runtime backend for embedding service.")

# Conditionally import ONNX runtime dependencies
if not HAS_PYTORCH:
    try:
        import onnxruntime as ort
        from tokenizers import Tokenizer
        from huggingface_hub import hf_hub_download
    except ImportError as e:
        logger.critical(f"Failed to import ONNX dependencies: {e}. Please ensure onnxruntime, tokenizers, and huggingface-hub are installed.")
        raise


class ONNXEmbeddingModel:
    """ONNX-backed lightweight SentenceTransformer model replacement."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        
        # Xenova/all-MiniLM-L6-v2 is the official/standard ONNX model representation of sentence-transformers/all-MiniLM-L6-v2
        hf_repo = "Xenova/all-MiniLM-L6-v2"
        logger.info(f"Downloading/Resolving ONNX embedding model weights from {hf_repo}...")
        
        try:
            model_path = hf_hub_download(repo_id=hf_repo, filename="onnx/model.onnx")
            tokenizer_path = hf_hub_download(repo_id=hf_repo, filename="tokenizer.json")
        except Exception as e:
            logger.error(f"Failed to download model files from Hugging Face: {e}")
            raise

        logger.info("Initializing ONNX inference session (CPU)...")
        # CPU optimization for single-core/low-resource servers
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self.session = ort.InferenceSession(
            model_path, 
            sess_options, 
            providers=["CPUExecutionProvider"]
        )
        self.tokenizer = Tokenizer.from_file(tokenizer_path)
        
        # Enable truncation and padding to max sequence limit of the model (256 tokens)
        self.tokenizer.enable_truncation(max_length=256)
        self.tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")

    def encode(self, texts: Union[str, List[str]], batch_size: int = 256, show_progress_bar: bool = False) -> np.ndarray:
        is_single = isinstance(texts, str)
        if is_single:
            texts = [texts]

        embeddings_list = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            encodings = self.tokenizer.encode_batch(batch_texts)

            # Convert Tokenizer outputs into NumPy input tensors
            input_ids = np.array([e.ids for e in encodings], dtype=np.int64)
            attention_mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)
            token_type_ids = np.array([e.type_ids for e in encodings], dtype=np.int64)

            inputs = {
                "input_ids": input_ids,
                "attention_mask": attention_mask,
                "token_type_ids": token_type_ids
            }

            # Run ONNX inference
            outputs = self.session.run(None, inputs)
            token_embeddings = outputs[0]  # shape: (batch_size, seq_len, 384)

            # Mean Pooling: compute averages over sequence length, matching sentence-transformers behavior
            input_mask_expanded = np.expand_dims(attention_mask, -1).astype(float)
            sum_embeddings = np.sum(token_embeddings * input_mask_expanded, 1)
            sum_mask = np.clip(np.sum(input_mask_expanded, 1), 1e-9, None)
            batch_embeddings = sum_embeddings / sum_mask

            # L2 Cosine Normalization
            norms = np.linalg.norm(batch_embeddings, ord=2, axis=1, keepdims=True)
            batch_embeddings = batch_embeddings / np.clip(norms, 1e-9, None)

            embeddings_list.append(batch_embeddings)

        embeddings = np.vstack(embeddings_list)
        return embeddings[0] if is_single else embeddings


class PlatformEmbeddingService:
    """Centralized vector embedding service with RAM LRU + SQLite persistent store."""

    def __init__(self, default_model: str = DEFAULT_EMBEDDING_MODEL):
        self.default_model_name = default_model
        self._loaded_models: Dict[str, Union["SentenceTransformer", "ONNXEmbeddingModel"]] = {}
        self._ram_cache: Dict[str, np.ndarray] = {}

    def _get_model(self, model_name: str) -> Union["SentenceTransformer", "ONNXEmbeddingModel"]:
        if model_name not in self._loaded_models:
            if HAS_PYTORCH:
                logger.info(f"Loading SentenceTransformer model into RAM (PyTorch): {model_name}...")
                self._loaded_models[model_name] = SentenceTransformer(model_name)
            else:
                logger.info(f"Loading ONNX embedding model: {model_name}...")
                self._loaded_models[model_name] = ONNXEmbeddingModel(model_name)
        return self._loaded_models[model_name]

    def encode_single(self, text: str, model_name: str = DEFAULT_EMBEDDING_MODEL) -> np.ndarray:
        key = f"{model_name}:{text}"
        if key in self._ram_cache:
            return self._ram_cache[key]

        cached = embedding_store.get_vector(text, model_name)
        if cached is not None:
            self._put_ram(key, cached)
            return cached

        transformer = self._get_model(model_name)
        vector = transformer.encode(text, show_progress_bar=False)

        embedding_store.save_vector(text, vector, model_name)
        self._put_ram(key, vector)
        return vector

    def encode_batch(self, texts: List[str], model_name: str = DEFAULT_EMBEDDING_MODEL, batch_size: int = 256) -> np.ndarray:
        if not texts:
            return np.empty((0, 384))

        results = []
        missing_indices = []
        missing_texts = []

        for idx, text in enumerate(texts):
            key = f"{model_name}:{text}"
            if key in self._ram_cache:
                results.append((idx, self._ram_cache[key]))
            else:
                cached = embedding_store.get_vector(text, model_name)
                if cached is not None:
                    self._put_ram(key, cached)
                    results.append((idx, cached))
                else:
                    missing_indices.append(idx)
                    missing_texts.append(text)

        if missing_texts:
            transformer = self._get_model(model_name)
            new_vectors = transformer.encode(missing_texts, batch_size=batch_size, show_progress_bar=False)
            for idx, text, vec in zip(missing_indices, missing_texts, new_vectors):
                key = f"{model_name}:{text}"
                embedding_store.save_vector(text, vec, model_name)
                self._put_ram(key, vec)
                results.append((idx, vec))

        results.sort(key=lambda x: x[0])
        return np.array([vec for _, vec in results])

    def _put_ram(self, key: str, vector: np.ndarray):
        if len(self._ram_cache) >= MAX_RAM_CACHE_ENTRIES:
            first_key = next(iter(self._ram_cache))
            del self._ram_cache[first_key]
        self._ram_cache[key] = vector


platform_embedding_service = PlatformEmbeddingService()
