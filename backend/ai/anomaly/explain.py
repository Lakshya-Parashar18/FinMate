import pandas as pd
import numpy as np
import datetime

def generate_anomaly_explanations(tx_row, df_history):
    """
    Analyzes how the current transaction row deviates from historical normal transactions
    to compile a list of human-readable explanations.
    """
    explanations = []
    
    amount = float(tx_row.get('amount', 0))
    category = tx_row.get('category', 'Miscellaneous')
    merchant = tx_row.get('description', '').lower().strip()
    hour = int(tx_row.get('hour', 12))
    
    if df_history.empty:
        return ["This is your first transaction, which has been established as a new baseline."]

    # Filter history to expenses only
    df_exp_hist = df_history[df_history['amount'] < 0].copy()
    df_exp_hist['abs_amount'] = df_exp_hist['amount'].abs()
    
    # Category historical subset
    df_cat_hist = df_exp_hist[df_exp_hist['category'] == category]
    
    # 1. Check if spending is significantly higher than usual category average
    if not df_cat_hist.empty:
        cat_avg = df_cat_hist['abs_amount'].mean()
        cat_std = df_cat_hist['abs_amount'].std()
        # Fallback std if 0 or NaN
        if np.isnan(cat_std) or cat_std == 0:
            cat_std = cat_avg * 0.3
            
        if amount > (cat_avg + 2.0 * cat_std) and amount > (cat_avg * 1.5):
            explanations.append(f"Spending is significantly higher than your usual average for the '{category}' category.")
    else:
        # First transaction in this category
        explanations.append(f"This is the first time you are spending in the '{category}' category.")

    # 2. Check if merchant has never been seen before
    if not df_exp_hist.empty:
        merchant_count = (df_exp_hist['description'].str.lower().str.strip() == merchant).sum()
        if merchant_count == 0:
            explanations.append("This merchant has never been seen in your transaction history.")
            
    # 3. Check if transaction occurred at an unusual time
    if not df_exp_hist.empty:
        # Standard hours: 8 AM to 10 PM. Unusual: 11 PM to 6 AM
        if hour < 6 or hour >= 23:
            # Check if user frequently spends during late nights
            late_night_txs = df_exp_hist[(df_exp_hist['date'].dt.hour < 6) | (df_exp_hist['date'].dt.hour >= 23)]
            late_night_ratio = len(late_night_txs) / len(df_exp_hist)
            if late_night_ratio < 0.1:  # if late night transactions are less than 10% of history
                explanations.append("This transaction occurred at an unusual time (late night/early morning).")

    # 4. Budget utilization check
    budget_util = float(tx_row.get('budget_utilization', 0))
    if budget_util > 0.85:
        explanations.append(f"Your budget utilization is already high ({int(budget_util * 100)}%) for the '{category}' category.")

    # 5. Largest purchase in the last 90 days check
    cutoff_90d = pd.Timestamp.now(tz='UTC') - pd.Timedelta(days=90)
    df_90d = df_exp_hist[df_exp_hist['date'] >= cutoff_90d]
    if not df_90d.empty:
        max_90d = df_90d['abs_amount'].max()
        if amount > max_90d:
            explanations.append("This is the largest purchase you have made in the last 90 days.")
            
    # Default fallback if no specific flags triggered but model marked as anomaly
    if not explanations:
        explanations.append("Overall transaction metrics (amount, time, category combination) deviate from your historical patterns.")
        
    return explanations
