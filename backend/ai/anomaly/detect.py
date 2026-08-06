import os
import sys
import json
import pandas as pd
import numpy as np

from .utils import fetch_raw_transactions, get_user_budgets
from .preprocess import clean_and_format_transactions
from .feature_engineering import extract_features_df, normalize_features
from .model_loader import load_user_model
from .train import train_anomaly_model
from .explain import generate_anomaly_explanations

def evaluate_transaction_anomaly(user_id, transaction_id):
    """
    Evaluates whether a specific transaction is anomalous.
    Handles automated retraining if 10 or more new transactions have elapsed since last training.
    """
    # 1. Fetch current transaction history
    raw_txs = fetch_raw_transactions(user_id)
    if not raw_txs:
        return {"error": "No transactions found for user"}
        
    df_txs = clean_and_format_transactions(raw_txs)
    if df_txs.empty:
        return {"error": "Transactions could not be preprocessed"}

    # Find the target transaction
    target_idx = df_txs[df_txs['_id'] == str(transaction_id)].index
    if len(target_idx) == 0:
        return {"error": "Target transaction ID not found in user history"}
    idx_in_df = target_idx[0]

    # 2. Model Management: Load or Train Model
    model, feature_cols, scaler_params, num_txs_trained = load_user_model(user_id)
    
    # Auto retrain if model is missing, or if >= 10 new transactions have occurred
    tx_count_diff = len(raw_txs) - num_txs_trained
    if not model or tx_count_diff >= 10:
        print(f"Retraining model. Model missing: {not model}. Count difference: {tx_count_diff}", file=sys.stderr)
        train_success = train_anomaly_model(user_id)
        if not train_success:
            # Fallback if training fails but we have a stale model
            if not model:
                return {"error": "Failed to train or load anomaly detection model"}
        else:
            model, feature_cols, scaler_params, num_txs_trained = load_user_model(user_id)

    # 3. Engineer features
    budgets = get_user_budgets(user_id)
    df_features, feature_cols, numerical_cols = extract_features_df(df_txs, budgets_list=budgets)
    if df_features.empty:
        return {"error": "Feature engineering failed"}
        
    # Get the row corresponding to our target transaction
    target_row = df_features.iloc[idx_in_df]
    
    # Normalize features using the model's scaler parameters
    df_features_norm, _ = normalize_features(df_features, numerical_cols, scaler_params)
    target_norm_row = df_features_norm.iloc[[idx_in_df]]
    
    X_target = target_norm_row[feature_cols]
    
    # 4. Run isolation forest predictions
    prediction = int(model.predict(X_target)[0])
    is_anomaly = bool(prediction == -1)
    
    # Decision function returns standard outlier score (negative is outlier, positive is inlier)
    decision_val = float(model.decision_function(X_target)[0])
    
    # Map decision_val to standard anomalyScore between 0.0 and 1.0
    # Isolation Forest decision values typically range between -0.5 and 0.5.
    # We map this: score = max(0.0, min(1.0, 0.5 - decision_val))
    anomaly_score = max(0.0, min(1.0, 0.5 - decision_val))
    
    # 5. Explainability analysis
    df_history = df_txs.iloc[:idx_in_df]
    reasons = []
    
    # If the score is elevated or marked as anomaly, compile explanation reasons
    if is_anomaly or anomaly_score > 0.45:
        reasons = generate_anomaly_explanations(target_row, df_history)
        
    # Compute severity tier
    severity = "none"
    if is_anomaly or anomaly_score > 0.48:
        if anomaly_score >= 0.70:
            severity = "high"
        elif anomaly_score >= 0.58:
            severity = "medium"
        else:
            severity = "low"
            
    return {
        "isAnomaly": is_anomaly,
        "anomalyScore": float(round(anomaly_score, 3)),
        "severity": severity,
        "reasons": reasons
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing user_id or transaction_id parameters"}), file=sys.stderr)
        sys.exit(1)
        
    user_id = sys.argv[1]
    transaction_id = sys.argv[2]
    
    try:
        res = evaluate_transaction_anomaly(user_id, transaction_id)
        print(json.dumps(res))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
