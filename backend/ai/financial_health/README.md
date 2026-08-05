# FinMate AI Financial Intelligence Engine

An intelligent Financial Assessment and Intelligence Engine designed for multi-dimensional financial behavior evaluation, ML health score prediction, sub-component scoring, Explainable AI (XAI) feature attribution, predictive trajectory modeling, and personalized action recommendations.

---

## System Architecture

```text
User Transactions / Income / Budget Data
                   │
                   ▼
     Financial Feature Builder
      (25+ Behavior & Financial Features)
                   │
                   ▼
     Score Engine + ML Regression Model
     (ExtraTrees / RandomForest / GradientBoosting)
                   │
                   ├───────────► 10 Sub-Component Scores (0-100)
                   ├───────────► Multi-Window Trend Analysis
                   ├───────────► Predictive Health Trajectory (+1m, +3m, +6m)
                   ├───────────► Explainable AI (XAI) Feature Impact
                   └───────────► Personalized Action Recommendations
```

---

## Directory Structure

```text
backend/ai/financial_health/
├── config.py                 # Tiers, weights, essential vs non-essential categories
├── utils.py                  # Score clamping & tiering helpers
├── feature_builder.py        # 25+ financial feature extractor
├── score_engine.py           # 10 sub-component scores & composite overall score calculator
├── behavior_analysis.py      # Essential vs non-essential & weekend/night spending analyzer
├── budget_analysis.py        # Utilization & budget violation analyzer
├── savings_analysis.py       # Savings rate & emergency fund reserve analyzer
├── investment_analysis.py    # SIP contribution & wealth accumulation analyzer
├── risk_analysis.py          # Expense volatility & cash flow stability analyzer
├── trend_analysis.py         # Multi-window historical trend analyzer
├── predictive_engine.py      # Trajectory projector (+1m, +3m, +6m)
├── explanation_engine.py     # XAI feature attribution & natural language driver generator
├── recommendation_engine.py  # Actionable personalized financial advice generator
├── train_health_model.py     # Machine Learning model training pipeline
├── model_loader.py           # Singleton health model loader
├── engine.py                 # Core AI Financial Intelligence Engine orchestrator
├── routes.py                 # FastAPI router endpoints
├── README.md                 # System documentation
├── trained_models/
│   ├── health_model.pkl      # Trained regression model weights (ExtraTrees)
│   └── health_metadata.json  # Feature importances & R2 metrics metadata
└── tests/
    └── test_financial_health.py # Unit test suite
```

---

## Sub-Component Scores (0–100 Scale)

1. **Savings Score**: Evaluates monthly net savings rate relative to gross income.
2. **Budget Discipline Score**: Measures budget limit adherence and violation frequency.
3. **Investment Habits Score**: Evaluates recurring SIP allocations and wealth building.
4. **Lifestyle Balance Score**: Measures discretionary vs essential expense balance.
5. **Expense Stability Score**: Tracks volatility and expense growth rates.
6. **Financial Consistency Score**: Measures transaction cadence and steady patterns.
7. **Emergency Preparedness Score**: Assesses liquid reserves in months of expenses.
8. **Goal Progress Score**: Evaluates target savings progress.
9. **Cash Flow Management Score**: Tracks income vs outflow stability.
10. **Risk Exposure Score**: Evaluates late-night spending, impulse buys, and subscription overhead.

---

## Production API Endpoints

### 1. Overall Financial Health Evaluation
`GET /api/ai/financial-health`

### 2. Custom Transaction Financial Health Evaluation
`POST /api/ai/financial-health/evaluate`

### 3. Predictive Health Trajectory
`GET /api/ai/financial-health/prediction`

### 4. Historical Trajectory
`GET /api/ai/financial-health/history`
