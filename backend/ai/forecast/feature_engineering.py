import pandas as pd
import numpy as np
import datetime

CATEGORIES = [
    "Food & Dining", "Rent & Housing", "Shopping", 
    "Utilities", "Transportation", "Entertainment", 
    "Healthcare", "Miscellaneous"
]

CATEGORY_MAP = {cat: idx for idx, cat in enumerate(CATEGORIES)}

def build_feature_matrix(df_txs, budget_info=None, user_income=50000):
    """
    Transforms transaction history into a daily category feature matrix for training or prediction.
    - df_txs: cleaned transactions DataFrame (expenses only or inclusive)
    - budget_info: user's budget document from DB
    - user_income: baseline monthly income
    """
    if df_txs.empty:
        return pd.DataFrame(), []

    # Filter to expenses only (amount < 0)
    df_expenses = df_txs[df_txs['amount'] < 0].copy()
    df_expenses['amount'] = df_expenses['amount'].abs()
    
    if df_expenses.empty:
        return pd.DataFrame(), []

    # Map categories
    df_expenses['category_idx'] = df_expenses['category'].map(CATEGORY_MAP).fillna(CATEGORY_MAP["Miscellaneous"])
    
    # Get overall budget limit
    overall_budget = 0
    cat_budgets = {}
    if budget_info:
        overall_budget = budget_info.get('totalLimit') or 0
        for cat_b in budget_info.get('categories', []):
            cat_budgets[cat_b['name']] = cat_b.get('limit', 0)

    # Get range of dates
    min_date = df_expenses['date'].min().tz_localize(None)
    max_date = df_expenses['date'].max().tz_localize(None)
    
    # Create complete date-category grid
    all_dates = pd.date_range(start=min_date.date(), end=max_date.date(), freq='D')
    grid = []
    for d in all_dates:
        for cat in CATEGORIES:
            grid.append({'date': d, 'category': cat, 'category_idx': CATEGORY_MAP[cat]})
            
    df_grid = pd.DataFrame(grid)
    
    # Aggregate daily spending by category
    df_expenses['date_only'] = df_expenses['date'].dt.tz_localize(None).dt.normalize()
    df_daily_spend = df_expenses.groupby(['date_only', 'category'])['amount'].sum().reset_index()
    df_daily_spend.rename(columns={'date_only': 'date', 'amount': 'daily_spend'}, inplace=True)
    
    # Merge daily spend into our grid
    df_features = pd.merge(df_grid, df_daily_spend, on=['date', 'category'], how='left')
    df_features['daily_spend'] = df_features['daily_spend'].fillna(0.0)
    
    # Add calendar features
    df_features['day_of_week'] = df_features['date'].dt.dayofweek
    df_features['day_of_month'] = df_features['date'].dt.day
    df_features['weekend_flag'] = (df_features['day_of_week'] >= 5).astype(int)
    df_features['month'] = df_features['date'].dt.month
    df_features['year'] = df_features['date'].dt.year
    df_features['days_in_month'] = df_features['date'].dt.daysinmonth
    df_features['remaining_days'] = df_features['days_in_month'] - df_features['day_of_month']
    
    # Sort for rolling operations
    df_features = df_features.sort_values(['category', 'date']).reset_index(drop=True)
    
    # Cumulative monthly spending so far for each category-date
    df_features['cumulative_spent'] = df_features.groupby(['category', 'year', 'month'])['daily_spend'].cumsum()
    
    # Rolling averages for daily spending
    df_features['rolling_avg_7d'] = df_features.groupby('category')['daily_spend'].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df_features['rolling_avg_30d'] = df_features.groupby('category')['daily_spend'].transform(lambda x: x.rolling(30, min_periods=1).mean())
    
    # Previous day's spending
    df_features['prev_day_spend'] = df_features.groupby('category')['daily_spend'].shift(1).fillna(0.0)
    
    # Budget and income features
    df_features['overall_budget'] = overall_budget
    df_features['category_budget'] = df_features['category'].map(cat_budgets).fillna(0.0)
    df_features['income'] = user_income
    
    # Calculate previous month's spending for each category
    # Group by category, year, month to get monthly spending
    df_monthly = df_features.groupby(['category', 'year', 'month'])['daily_spend'].sum().reset_index()
    df_monthly.rename(columns={'daily_spend': 'monthly_total'}, inplace=True)
    
    # Shift to get previous month's total
    df_monthly['prev_month_spent'] = df_monthly.groupby('category')['monthly_total'].shift(1).fillna(0.0)
    
    # Merge previous month's spending back into features
    df_features = pd.merge(df_features, df_monthly[['category', 'year', 'month', 'prev_month_spent']], on=['category', 'year', 'month'], how='left')
    df_features['prev_month_spent'] = df_features['prev_month_spent'].fillna(0.0)
    
    # Define Target: remaining spending in the month for this category-date
    # Target = Total category spent this month - cumulative category spent up to day D
    df_monthly_totals = df_features.groupby(['category', 'year', 'month'])['daily_spend'].sum().reset_index()
    df_monthly_totals.rename(columns={'daily_spend': 'total_month_spent'}, inplace=True)
    
    df_features = pd.merge(df_features, df_monthly_totals, on=['category', 'year', 'month'], how='left')
    df_features['target_remaining_spent'] = df_features['total_month_spent'] - df_features['cumulative_spent']
    # The target cannot be negative
    df_features['target_remaining_spent'] = df_features['target_remaining_spent'].clip(lower=0.0)
    
    # Drop temp grouping columns
    df_features.drop(columns=['total_month_spent'], inplace=True, errors='ignore')
    
    feature_cols = [
        'category_idx', 'day_of_week', 'day_of_month', 'weekend_flag', 'month', 
        'remaining_days', 'cumulative_spent', 'prev_month_spent', 
        'rolling_avg_7d', 'rolling_avg_30d', 'prev_day_spend', 
        'overall_budget', 'category_budget', 'income'
    ]
    
    return df_features, feature_cols
