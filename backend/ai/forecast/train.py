import os
import sys
import pandas as pd
from xgboost import XGBRegressor
from utils import fetch_raw_transactions, get_db_client, get_user_budget, get_database
from preprocess import clean_and_format_transactions
from feature_engineering import build_feature_matrix
from model_loader import save_model

def train_user_model(user_id):
    """
    Trains a personalized XGBoost spending forecast model for the user.
    """
    print(f"Starting training process for user: {user_id}", file=sys.stderr)
    
    # 1. Fetch raw transaction records
    raw_txs = fetch_raw_transactions(user_id)
    if not raw_txs or len(raw_txs) < 5:
        print("Insufficient historical transaction records to train a model.", file=sys.stderr)
        return False
        
    # 2. Clean and preprocess raw data
    df_txs = clean_and_format_transactions(raw_txs)
    if df_txs.empty:
        print("Data preprocessing failed — empty dataset.", file=sys.stderr)
        return False
        
    # Get user budget metadata from db
    client = get_db_client()
    db = get_database(client)
    # Read budget for the current month
    now = pd.Timestamp.now()
    budget_info = get_user_budget(db, user_id, now.year, now.month - 1) # 0-11
    client.close()
    
    # 3. Build features matrix
    df_features, feature_cols = build_feature_matrix(df_txs, budget_info=budget_info)
    if df_features.empty or 'target_remaining_spent' not in df_features.columns:
        print("Feature engineering failed — no features extracted.", file=sys.stderr)
        return False
        
    # Split features and target
    X = df_features[feature_cols]
    y = df_features['target_remaining_spent']
    
    # Check if we have valid datasets
    if X.shape[0] < 5:
        print("Dataset size too small for training.", file=sys.stderr)
        return False
        
    # 4. Train XGBoost Regressor
    model = XGBRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    model.fit(X, y)
    print("XGBoost Regressor model successfully fitted.", file=sys.stderr)
    
    # 5. Persist model
    save_model(model, feature_cols)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python train.py <user_id>", file=sys.stderr)
        sys.exit(1)
        
    user_id = sys.argv[1]
    success = train_user_model(user_id)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
