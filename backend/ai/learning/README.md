# FinMate MLOps & Continuous Learning Platform

An automated MLOps & Continuous Learning Lifecycle Platform for FinMate. Continuously collects real user feedback, discovers unknown merchants, samples low-confidence predictions via Active Learning, auto-merges datasets, retrains models, benchmarks candidate models against production, safely deploys improvements, and supports instant 1-click rollbacks.

---

## MLOps Lifecycle Flow

```text
User Actions (Category Corrections / New Transactions)
                      │
                      ▼
         Feedback & Active Learning
    (Feedback CSV + Unknown Merchants + Low-Confidence)
                      │
                      ▼
               Dataset Manager
    (Deduplication + Class Balancing + Label Validation)
                      │
                      ▼
        Retraining Service Pipeline (`retrain.py`)
     (Generate Vector Embeddings + Train Classifiers)
                      │
                      ▼
        Model Comparison & Benchmarking
   (Accuracy, Top-3 Acc, F1-Weighted, Regressions)
           ┌──────────┴──────────┐
    Passed Benchmark      Failed Benchmark
           │                     │
           ▼                     ▼
     Safe Deployment      Discard Candidate
   (Hot-Swap Model)     (Retain Prod Model)
```

---

## Directory Structure

```text
backend/ai/learning/
├── config.py                 # Thresholds, dataset paths, & category configs
├── feedback_service.py       # User correction feedback collector (CSV + Mongo)
├── active_learning.py        # Priority sampler (Low-confidence & Unknown merchants)
├── dataset_manager.py        # Dataset merger, deduplication, & class balancing
├── retraining_service.py     # End-to-end retraining & benchmark evaluator
├── scheduler.py              # Automated retraining threshold checker
├── evaluation.py             # Model candidate vs Production evaluator
├── model_registry.py         # MLOps versioning & deployment history registry
├── deployment.py             # Hot-swap model deployment manager
├── rollback.py               # Instant 1-click version rollback manager
├── versioning.py             # Semantic version incrementer & archiver
├── analytics.py              # MLOps analytics report generator
├── quality_monitor.py        # Accuracy, feedback, & unknown merchant monitor
├── drift_detection.py        # Category & merchant KL-divergence drift detector
├── notifications.py         # MLOps alert dispatcher
├── retrain.py                # CLI retraining execution entrypoint
├── README.md                 # System documentation
├── api/
│   ├── __init__.py
│   └── learning_routes.py    # FastAPI endpoint router
└── tests/
    ├── __init__.py
    └── test_learning.py      # Unit test suite
```

---

## MLOps API Endpoints

### 1. Submit Category Correction Feedback
`POST /api/ai/feedback`

**Request Body:**
```json
{
  "merchant": "Swiggy",
  "correct_category": "Groceries",
  "merchant_alias": "SWIGGY INSTAMART",
  "description": "Milk & Fresh Eggs",
  "original_prediction": "Food & Dining",
  "confidence": 0.85,
  "user_persona": "Student"
}
```

---

### 2. Trigger Model Retraining Pipeline
`POST /api/ai/retrain`

**Request Body:**
```json
{
  "force": false
}
```

---

### 3. Instant Rollback to Historical Version
`POST /api/ai/rollback`

**Request Body:**
```json
{
  "version": "v1.0.0",
  "reason": "Investigating false positive drift in Shopping category"
}
```

---

### 4. MLOps Analytics Report
`GET /api/ai/analytics`

---

### 5. Data Drift Status
`GET /api/ai/drift`

---

## Retraining CLI Usage

To trigger manual retraining from terminal:

```bash
python backend/ai/learning/retrain.py
```
