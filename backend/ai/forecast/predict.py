import os
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import norm

from utils import fetch_raw_transactions, get_db_client, get_user_budget, get_database
from preprocess import clean_and_format_transactions
from feature_engineering import build_feature_matrix, CATEGORIES, CATEGORY_MAP
from model_loader import load_model
from train import train_user_model

def get_forecast(user_id):
    """
    Retrieves the trained model (training it if missing), extracts current features,
    and returns predictions for the current month.
    """
    # 1. Load Model
    model, features_list = load_model()
    if not model:
        print("No pre-trained model found. Training one dynamically...", file=sys.stderr)
        train_success = train_user_model(user_id)
        if not train_success:
            return {"error": "Failed to train or load forecasting model"}
        model, features_list = load_model()
        if not model:
            return {"error": "Model training succeeded but failed to load"}

    # 2. Fetch raw transactions
    raw_txs = fetch_raw_transactions(user_id)
    if not raw_txs:
        return {"error": "No transactions found for user"}
        
    df_txs = clean_and_format_transactions(raw_txs)
    if df_txs.empty:
        return {"error": "Transactions could not be preprocessed"}

    # 3. Get database metadata
    client = get_db_client()
    db = get_database(client)
    
    now = pd.Timestamp.now(tz='UTC')
    current_year = now.year
    current_month = now.month - 1  # 0-11
    
    budget_info = get_user_budget(db, user_id, current_year, current_month)
    client.close()
    
    # Define budget and income parameters
    budget_limit = 0
    cat_budgets = {}
    if budget_info:
        budget_limit = budget_info.get('totalLimit') or 0
        for cat_b in budget_info.get('categories', []):
            cat_budgets[cat_b['name']] = cat_b.get('limit', 0)
            
    # Calculate user's monthly income
    df_income = df_txs[df_txs['type'] == 'income']
    income_val = 50000
    if not df_income.empty:
        # Get average monthly income
        monthly_income_sums = df_income.groupby([df_income['date'].dt.year, df_income['date'].dt.month])['amount'].sum()
        if not monthly_income_sums.empty:
            income_val = float(monthly_income_sums.mean())
            
    # 4. Build feature matrix for predictions
    df_features, feature_cols = build_feature_matrix(df_txs, budget_info=budget_info, user_income=income_val)
    if df_features.empty:
        return {"error": "Could not extract features for prediction"}

    # Get daily expenses standard deviation to calculate budget overrun probability
    df_expenses = df_txs[df_txs['amount'] < 0].copy()
    df_expenses['amount'] = df_expenses['amount'].abs()
    df_expenses['date_only'] = df_expenses['date'].dt.tz_localize(None).dt.normalize()
    daily_totals = df_expenses.groupby('date_only')['amount'].sum()
    daily_std = float(daily_totals.std()) if len(daily_totals) > 1 else 100.0
    if np.isnan(daily_std) or daily_std == 0:
        daily_std = 150.0

    # Build the inference vectors for "today" for each category
    # Find the maximum date corresponding to the current month in our engineered features
    df_curr_month = df_features[
        (df_features['year'] == current_year) & 
        (df_features['month'] == current_month + 1)
    ]
    
    # If no data for this month in the features, use the latest overall date
    if df_curr_month.empty:
        latest_date = df_features['date'].max()
    else:
        latest_date = df_curr_month['date'].max()
        
    df_latest = df_features[df_features['date'] == latest_date].copy()
    
    # Re-verify we have rows for each category
    predictions_map = {}
    category_forecasts_list = []
    
    # Split features
    X_pred = df_latest[features_list]
    predictions = model.predict(X_pred)
    
    # Limit remaining spend to non-negative
    predictions = np.clip(predictions, a_min=0.0, a_max=None)
    
    total_current_spent = 0
    total_predicted_remaining = 0
    
    for idx, row in df_latest.iterrows():
        cat = row['category']
        pred_idx = features_list.index('category_idx') if 'category_idx' in features_list else None
        
        # Match row's predicted remaining spend
        predicted_remaining = float(predictions[df_latest.index.get_loc(idx)])
        current_spent = float(row['cumulative_spent'])
        
        predicted_total_cat = current_spent + predicted_remaining
        
        total_current_spent += current_spent
        total_predicted_remaining += predicted_remaining
        
        predictions_map[cat] = int(round(predicted_total_cat))
        
        category_forecasts_list.append({
            "category": cat,
            "currentSpent": int(round(current_spent)),
            "projected": int(round(predicted_total_cat))
        })
        
    predicted_total = total_current_spent + total_predicted_remaining
    predicted_savings = max(0.0, income_val - predicted_total)
    
    # Compute budget overrun probability using normal CDF
    remaining_days = max(1, int(row['remaining_days']))
    overrun_prob = 0.0
    if budget_limit > 0:
        # Sum of variance = remaining_days * daily_variance (assuming independence)
        total_std = daily_std * np.sqrt(remaining_days)
        Z = (budget_limit - total_current_spent - total_predicted_remaining) / (total_std + 1e-9)
        overrun_prob = float(1.0 - norm.cdf(Z))
        
    # Calculate confidence label and percentage
    # High confidence if late in month, or if historical transactions are large, low daily standard deviation
    days_elapsed = row['day_of_month']
    days_in_month = row['days_in_month']
    elapsed_ratio = days_elapsed / days_in_month
    
    confidence_val = 55.0 + (elapsed_ratio * 30.0)  # base ranges 55% - 85%
    # Add bonus for larger historical datasets
    history_bonus = min(10.0, len(df_txs) / 50.0)
    confidence_val = min(95.0, confidence_val + history_bonus)
    
    confidence_label = "High" if confidence_val >= 80 else ("Medium" if confidence_val >= 60 else "Low")
    
    # Construct complete return object
    output = {
        "predictedTotal": int(round(predicted_total)),
        "predictedSavings": int(round(predicted_savings)),
        "budgetOverrunProbability": float(round(overrun_prob, 3)),
        "confidence": float(round(confidence_val, 1)),
        "confidenceLabel": confidence_label,
        "projectedRemainingBudget": int(round(max(0.0, budget_limit - predicted_total))),
        "isLikelyToExceed": bool(predicted_total > budget_limit) if budget_limit > 0 else False,
        "categoryForecast": predictions_map,
        "categoryForecasts": category_forecasts_list,
        "warningMessage": ""
    }
    
    # Build a friendly human warning message matching previous controllers
    if budget_limit > 0:
        if output["isLikelyToExceed"]:
            output["warningMessage"] = f"Warning: Based on AI predictions, you are projected to exceed your monthly budget by ₹{int(round(predicted_total - budget_limit)):,}. Consider reducing discretionary spending."
        else:
            output["warningMessage"] = f"You are projected to stay within your monthly budget. Maintain your current spending patterns to save ₹{int(round(budget_limit - predicted_total)):,} by the end of the month."
    else:
        output["warningMessage"] = "Set a monthly budget to compare your forecast and receive overspending alerts."
        
    return output

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing user_id parameter"}), file=sys.stderr)
        sys.exit(1)
        
    user_id = sys.argv[1]
    try:
        res = get_forecast(user_id)
        print(json.dumps(res))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
