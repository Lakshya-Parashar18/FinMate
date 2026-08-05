import pandas as pd
import numpy as np

def clean_and_format_transactions(raw_transactions):
    """
    Cleans raw MongoDB transaction records and outputs a sorted Pandas DataFrame.
    """
    if not raw_transactions:
        return pd.DataFrame()
        
    df = pd.DataFrame(raw_transactions)
    
    df['_id'] = df['_id'].apply(str)
    df['date'] = pd.to_datetime(df['date'], utc=True)
    df['createdAt'] = pd.to_datetime(df['createdAt'], utc=True)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
    df['type'] = df['type'].astype(str).str.lower().str.strip()
    df['category'] = df['category'].astype(str).str.strip()
    df['description'] = df['description'].fillna('').astype(str).str.strip()
    
    # Sort chronologically
    df = df.sort_values('date').reset_index(drop=True)
    
    return df
