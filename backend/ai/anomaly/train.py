import os
import sys
import pandas as pd
from sklearn.ensemble import IsolationForest

from .utils import fetch_raw_transactions, get_user_budgets
from .preprocess import clean_and_format_transactions
from .feature_engineering import extract_features_df, normalize_features
from .model_loader import save_user_model

def train_anomaly_model(user_id):
    """
    Fetches user transactions, engineers features, normalizes numerical parameters,
    fits an Isolation Forest model, and serializes the model state.
    """
    print(f"Starting anomaly training process for user: {user_id}", file=sys.stderr)
    
    # 1. Fetch raw transaction records
    raw_txs = fetch_raw_transactions(user_id)
    if not raw_txs:
        print("No transactions found to train model.", file=sys.stderr)
        return False
        
    # 2. Clean and preprocess raw data
    df_txs = clean_and_format_transactions(raw_txs)
    if df_txs.empty:
        print("Transactions cleaning failed — empty dataframe.", file=sys.stderr)
        return False
        
    # Get user budgets
    budgets = get_user_budgets(user_id)
    
    # 3. Build features matrix
    df_features, feature_cols, numerical_cols = extract_features_df(df_txs, budgets_list=budgets)
    if df_features.empty:
        print("Feature engineering failed — empty features grid.", file=sys.stderr)
        return False
        
    # 4. Normalize numeric features
    df_features_norm, scaler_params = normalize_features(df_features, numerical_cols)
    
    # Extract features array for training
    X = df_features_norm[feature_cols]
    
    # Check if we have enough samples
    if X.shape[0] < 5:
        print("Dataset size too small to train anomaly model.", file=sys.stderr)
        return False
        
    # 5. Fit Isolation Forest Model
    # contamination defines the expected proportion of outliers (anomalies) in the training data
    model = IsolationForest(
        n_estimators=100,
        contamination=0.03,
        random_state=42
    )
    
    model.fit(X)
    print("Isolation Forest model successfully trained.", file=sys.stderr)
    
    # 6. Save model payload
    save_user_model(
        user_id=user_id,
        model=model,
        feature_cols=feature_cols,
        scaler_params=scaler_params,
        num_transactions=len(raw_txs)
    )
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python train.py <user_id>", file=sys.stderr)
        sys.exit(1)
        
    user_id = sys.argv[1]
    success = train_anomaly_model(user_id)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
