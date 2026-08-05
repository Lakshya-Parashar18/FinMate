# FinMate AI Transaction Categorization Engine

An industrial-grade, NLP-powered transaction categorization engine built for FinMate. Uses Sentence Transformers (`all-MiniLM-L6-v2`) and machine learning classifiers to semantically understand merchant names, aliases, descriptions, and amounts without fragile hardcoded keyword rules.

---

## Key Features

- **Semantic Merchant Understanding**:
  - Understands variations like `SWIGGY`, `Swiggy`, `SWIGGY*PAY`, `Swiggy Bangalore`, `Swiggy Instamart` → `Food & Dining`.
  - Understands `UBER`, `UBER TRIP`, `UBER INDIA` → `Transportation`.
- **Pretrained Transformer Embeddings**:
  - Uses `sentence-transformers/all-MiniLM-L6-v2` to map text into 384-dimensional dense semantic vectors.
- **SQLite Persistent Embedding Cache**:
  - Automatically caches generated text vectors in `trained_models/embedding_cache.db` to prevent redundant recomputation.
- **Multi-Model Benchmark & Evaluation**:
  - Automatically trains and evaluates `LogisticRegression`, `RandomForest`, `GradientBoosting`, and `MLP` (Neural Network) classifiers, selecting the top-performing model.
- **Confidence Calibration**:
  - Categorizes predictions into `LOW` (< 70%), `MEDIUM` (70–90%), and `HIGH` (> 90%) confidence levels.
- **Sub-100ms Inference**:
  - Fast single & batch inference API support.
- **Model Registry & Versioning**:
  - Tracks model version, training dates, sample counts, category performance, and saves metadata in `classifier_metadata.json`.

---

## Directory Structure

```text
backend/ai/categorization/
├── config.py                 # Core configuration settings
├── train.py                  # CLI training script
├── predict.py                # CLI inference script
├── requirements.txt          # Dependencies
├── README.md                 # System documentation
├── preprocessing/            # Cleaning, normalizing, & feature building
│   ├── text_cleaner.py
│   ├── merchant_normalizer.py
│   └── feature_builder.py
├── embeddings/               # SentenceTransformer & SQLite caching
│   ├── embedding_service.py
│   ├── embedding_cache.py
│   └── embedding_store.py
├── models/                   # Classifiers, training, evaluation, & registry
│   ├── classifier.py
│   ├── training.py
│   ├── evaluation.py
│   ├── metrics.py
│   ├── prediction.py
│   ├── model_loader.py
│   └── model_registry.py
├── api/                      # FastAPI router & service layers
│   ├── routes.py
│   └── services.py
├── utils/                    # Logger, config, and helper utilities
│   ├── logger.py
│   ├── config.py
│   └── helpers.py
├── tests/                    # Unit testing suite
│   ├── test_preprocessing.py
│   └── test_caching.py
├── trained_models/           # Saved model artifacts & cache DB
│   ├── merchant_classifier.joblib
│   ├── classifier_metadata.json
│   └── embedding_cache.db
└── training_logs/            # Metrics & confusion matrices
    ├── evaluation_report.json
    └── confusion_matrix.json
```

---

## Quick Start Guide

### 1. Install Dependencies
```bash
pip install -r backend/ai/categorization/requirements.txt
```

### 2. Train the Categorization Model
Train on the generated synthetic dataset:
```bash
python backend/ai/categorization/train.py --samples 50000
```

### 3. Run Single Transaction Prediction (CLI)
```bash
python backend/ai/categorization/predict.py --merchant "SWIGGY*PAY BANGALORE" --desc "Chicken Biryani & Coke"
```

Output:
```json
{
  "predictedCategory": "Food & Dining",
  "confidence": 0.9854,
  "confidenceLevel": "HIGH",
  "topPredictions": [
    { "category": "Food & Dining", "confidence": 0.9854 },
    { "category": "Groceries", "confidence": 0.0102 },
    { "category": "Shopping", "confidence": 0.0024 }
  ],
  "latency_ms": 18.4
}
```

---

## Swapping Embedding or Classifier Models

### Replacing Transformer Embedding Model
To upgrade to `FinBERT`, `MPNet`, `DeBERTa`, or an external API provider:
1. Update `DEFAULT_EMBEDDING_MODEL` in `config.py`:
   ```python
   DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2"
   ```
2. Re-run `python train.py`.

### Swapping Classifiers
To force a specific classifier (e.g. `MLP` or `RandomForest`):
1. Change `DEFAULT_CLASSIFIER` in `config.py`:
   ```python
   DEFAULT_CLASSIFIER = "MLP"
   ```
2. Re-run `python train.py`.
