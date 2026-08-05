import pandas as pd
import numpy as np

CATEGORIES = [
    "Food & Dining", "Rent & Housing", "Shopping", 
    "Utilities", "Transportation", "Entertainment", 
    "Healthcare", "Miscellaneous", "Salary"
]
CATEGORY_MAP = {cat: idx for idx, cat in enumerate(CATEGORIES)}

def extract_features_df(df_txs, budgets_list=None):
    """
    Computes chronological features for all transactions in the DataFrame.
    """
    if df_txs.empty:
        return pd.DataFrame(), []

    # Map categories to indices
    df_txs['category_idx'] = df_txs['category'].map(CATEGORY_MAP).fillna(CATEGORY_MAP["Miscellaneous"])
    
    # Extract time components
    df_txs['hour'] = df_txs['date'].dt.hour
    df_txs['day_of_week'] = df_txs['date'].dt.dayofweek
    df_txs['weekend_flag'] = (df_txs['day_of_week'] >= 5).astype(int)
    
    # Calculate amount as positive expense value
    df_txs['abs_amount'] = df_txs['amount'].abs()
    
    # Parse budget information
    budget_limits = {}
    if budgets_list:
        for b in budgets_list:
            year, month = b.get('year'), b.get('month')
            budget_limits[(year, month)] = {
                'totalLimit': b.get('totalLimit') or 0,
                'categories': {c['name']: c['limit'] for c in b.get('categories', [])}
            }

    # Arrays to accumulate row-by-row features
    feature_rows = []
    
    # Sort chronologically to compute sequential states correctly
    df_sorted = df_txs.sort_values('date').reset_index(drop=True)
    
    for i in range(len(df_sorted)):
        row = df_sorted.iloc[i]
        tx_date = row['date']
        tx_category = row['category']
        tx_merchant = row['description'].lower().strip()
        tx_year = tx_date.year
        tx_month = tx_date.month - 1  # 0-11
        
        # Historical context: only look at transactions strictly before this one
        df_history = df_sorted.iloc[:i]
        
        # Category average
        df_cat_hist = df_history[df_history['category'] == tx_category]
        cat_avg = df_cat_hist['abs_amount'].mean() if not df_cat_hist.empty else row['abs_amount']
        
        # Merchant frequency
        merchant_count = (df_history['description'].str.lower().str.strip() == tx_merchant).sum()
        total_hist = len(df_history)
        merchant_freq = merchant_count / total_hist if total_hist > 0 else 0.0
        
        # Time since previous transaction in hours
        if i > 0:
            prev_date = df_sorted.iloc[i - 1]['date']
            time_since_prev = (tx_date - prev_date).total_seconds() / 3600.0
        else:
            time_since_prev = 24.0 # default 1 day
            
        # Amount deviation from historical category average
        amt_deviation = row['abs_amount'] - cat_avg
        
        # Current month's cumulative spending prior to this transaction
        df_month = df_history[
            (df_history['date'].dt.year == tx_year) & 
            (df_history['date'].dt.month == tx_date.month) & 
            (df_history['type'] == 'expense')
        ]
        monthly_spending = df_month['abs_amount'].sum()
        
        # Category budget limit
        budget_limit = 0.0
        if (tx_year, tx_month) in budget_limits:
            budget_limit = budget_limits[(tx_year, tx_month)]['categories'].get(tx_category, 0.0)
            if budget_limit == 0:
                budget_limit = budget_limits[(tx_year, tx_month)]['totalLimit'] or 0.0
                
        # Category cumulative spending so far this month
        cat_monthly_spending = df_month[df_month['category'] == tx_category]['abs_amount'].sum()
        budget_utilization = cat_monthly_spending / budget_limit if budget_limit > 0 else 0.0
        
        # Daily aggregated totals for rolling metrics
        # Look back 30 days of daily spending totals
        cutoff_30d = tx_date - pd.Timedelta(days=30)
        df_30d = df_history[(df_history['date'] >= cutoff_30d) & (df_history['type'] == 'expense')]
        
        daily_totals = df_30d.groupby(df_30d['date'].dt.normalize())['abs_amount'].sum()
        
        rolling_avg_7d = daily_totals.tail(7).mean() if len(daily_totals) > 0 else row['abs_amount']
        rolling_avg_30d = daily_totals.mean() if len(daily_totals) > 0 else row['abs_amount']
        
        rolling_std_7d = daily_totals.tail(7).std() if len(daily_totals) > 1 else 0.0
        rolling_std_30d = daily_totals.std() if len(daily_totals) > 1 else 0.0
        
        # Transaction frequency (transactions count in last 30 days)
        tx_frequency_30d = len(df_30d)
        
        feature_rows.append({
            '_id': row['_id'],
            'amount': row['abs_amount'],
            'category_idx': row['category_idx'],
            'hour': row['hour'],
            'day_of_week': row['day_of_week'],
            'weekend_flag': row['weekend_flag'],
            'monthly_spending': monthly_spending,
            'category_average': cat_avg,
            'merchant_frequency': merchant_freq,
            'transaction_frequency': tx_frequency_30d,
            'rolling_avg_7d': rolling_avg_7d,
            'rolling_avg_30d': rolling_avg_30d,
            'rolling_std_7d': rolling_std_7d,
            'rolling_std_30d': rolling_std_30d,
            'budget_utilization': budget_utilization,
            'time_since_prev': time_since_prev,
            'amount_deviation': amt_deviation
        })
        
    df_features = pd.DataFrame(feature_rows)
    # Impute any remainders
    df_features = df_features.fillna(0.0)
    
    numerical_cols = [
        'amount', 'hour', 'day_of_week', 'monthly_spending', 'category_average',
        'merchant_frequency', 'transaction_frequency', 'rolling_avg_7d', 'rolling_avg_30d',
        'rolling_std_7d', 'rolling_std_30d', 'budget_utilization', 'time_since_prev',
        'amount_deviation'
    ]
    
    feature_cols = ['category_idx', 'weekend_flag'] + numerical_cols
    
    return df_features, feature_cols, numerical_cols

def normalize_features(df_features, numerical_cols, scaler_params=None):
    """
    Applies standard scaling (Z-score normalization) to all numerical input features.
    If scaler_params is provided, it uses those (for inference), otherwise it computes them (for training).
    """
    df_norm = df_features.copy()
    new_scaler_params = {}
    
    for col in numerical_cols:
        if col not in df_norm.columns:
            continue
        
        if scaler_params and col in scaler_params:
            mean = scaler_params[col]['mean']
            std = scaler_params[col]['std']
        else:
            mean = float(df_norm[col].mean())
            std = float(df_norm[col].std())
            if std == 0:
                std = 1.0
            new_scaler_params[col] = {'mean': mean, 'std': std}
            
        df_norm[col] = (df_norm[col] - mean) / (std + 1e-9)
        
    return df_norm, new_scaler_params
