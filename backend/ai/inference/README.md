# FinMate AI Transaction Categorization Inference System

A production-grade, non-crashing AI Inference Engine designed for real-time transaction categorization, batch bank statement imports, and background transaction enrichment in FinMate.

---

## Architecture Overview

```text
Transaction Request (Single / Batch / Import)
                      │
                      ▼
            Failsafe Validation
                      │
                      ▼
         Merchant Normalization Engine
          (Strips corporate noise & city codes)
                      │
                      ▼
        Transformer Embedding Cache (RAM + SQLite)
           ┌──────────┴──────────┐
      Cache Hit             Cache Miss
           │                     │
           ▼                     ▼
     Reuse Embedding     Generate MiniLM Embedding
           └──────────┬──────────┘
                      │
                      ▼
          ML Classifier Inference
           (LogisticRegression / MLP)
                      │
                      ▼
         Confidence Calibration Engine
            (HIGH: >90%, MED: 70-90%, LOW: <70%)
                      │
                      ▼
          Attach AI Metadata Payload
                      │
                      ▼
         Response / Database Persistence
```

---

## Failsafe Fallback Hierarchy

To ensure FinMate **NEVER** crashes due to AI service downtime or unhandled edge cases, the system follows a 4-layer fallback hierarchy:

1. **User Manual Selection**: If user manually selected a category, respects the user choice and flags for future model training.
2. **AI Inference Prediction**: Uses Transformer embeddings + ML classifier.
3. **Merchant Catalog Fallback**: Queries `merchant_metadata.csv` catalog if AI confidence is low or uninitialized.
4. **Final Fallback**: Assigns `Miscellaneous`.

---

## Directory Structure

```text
backend/ai/inference/
├── config.py                 # System paths, model parameters, & threshold configs
├── model_loader.py           # Singleton model loader (Loads Transformer & Classifier ONCE)
├── embedding_service.py      # Vector embedding generator with cache lookup
├── cache_service.py          # RAM LRU + SQLite persistent embedding cache
├── merchant_service.py       # Merchant string cleaning & normalization
├── confidence_service.py     # Probability calibration & top-3 prediction formatter
├── categorization_service.py # Core single transaction AI categorization service
├── prediction_service.py     # Failsafe manager (AI -> Merchant Catalog -> Miscellaneous)
├── batch_service.py          # High-throughput batch inference pipeline
├── health_service.py         # System health & model status evaluator
├── metrics.py                # Real-time thread-safe metrics & telemetry tracker
├── monitoring.py             # Telemetry snapshot exporter for alerting dashboards
├── logging_service.py        # Production logger
├── middleware.py             # Backend transaction creation interceptor
├── README.md                 # System documentation
├── api/
│   ├── __init__.py
│   └── ai_routes.py          # FastAPI production endpoint router
└── tests/
    ├── __init__.py
    └── test_inference.py     # Unit test suite
```

---

## Production API Endpoints

### 1. Categorize Single Transaction
`POST /api/ai/categorize`

**Request Body:**
```json
{
  "merchant": "SWIGGY*PAY BANGALORE",
  "merchant_alias": "SWIGGY*PAY",
  "description": "Chicken Biryani & Coke",
  "notes": "Late night dinner"
}
```

**Response:**
```json
{
  "merchant": "SWIGGY*PAY BANGALORE",
  "category": "Food & Dining",
  "confidence": 0.9854,
  "confidenceLevel": "HIGH",
  "topPredictions": [
    { "category": "Food & Dining", "confidence": 0.9854 },
    { "category": "Groceries", "confidence": 0.0102 },
    { "category": "Shopping", "confidence": 0.0024 }
  ],
  "aiMetadata": {
    "predictedCategory": "Food & Dining",
    "confidence": 0.9854,
    "confidenceLevel": "HIGH",
    "modelVersion": "1.0.0",
    "classifierType": "LogisticRegression",
    "predictionLatency_ms": 14.2,
    "embeddingVersion": "sentence-transformers/all-MiniLM-L6-v2",
    "predictionTimestamp": "2026-08-05T18:45:00.123456",
    "merchantNormalized": "Swiggy",
    "isUnknownMerchant": false
  }
}
```

---

### 2. Categorize Batch Transactions (Statement Import)
`POST /api/ai/categorize/batch`

**Request Body:**
```json
{
  "transactions": [
    { "merchant": "Swiggy", "description": "Biryani" },
    { "merchant": "Uber Trip", "description": "Airport ride" },
    { "merchant": "D-Mart", "description": "Monthly groceries" }
  ]
}
```

---

### 3. Model Status
`GET /api/ai/model/status`

**Response:**
```json
{
  "status": "HEALTHY",
  "modelLoaded": true,
  "modelVersion": "1.0.0",
  "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2",
  "classifier": "LogisticRegression",
  "accuracy": 0.988,
  "f1Score": 0.987
}
```

---

### 4. System Health & Telemetry
`GET /api/ai/health`

**Response:**
```json
{
  "health": "HEALTHY",
  "cache": {
    "hits": 1420,
    "misses": 80,
    "hitRatePercent": 94.67
  },
  "metrics": {
    "predictionCount": 1500,
    "averageLatency_ms": 12.5,
    "unknownMerchantsCount": 15,
    "fallbackCount": 0,
    "confidenceDistribution": {
      "HIGH": 1420,
      "MEDIUM": 70,
      "LOW": 10
    }
  }
}
```
