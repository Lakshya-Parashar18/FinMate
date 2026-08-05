import pandas as pd
import numpy as np

def clean_and_format_transactions(raw_transactions):
    """
    Converts raw MongoDB transaction dictionaries into a clean Pandas DataFrame 
    with correct dates, numeric amounts, and standardized categories.
    """
    if not raw_transactions:
        return pd.DataFrame()
        
    df = pd.DataFrame(raw_transactions)
    
    # Ensure ID and dates are properly processed
    df['_id'] = df['_id'].apply(str)
    df['date'] = pd.to_datetime(df['date'], utc=True)
    df['createdAt'] = pd.to_datetime(df['createdAt'], utc=True)
    
    # Cast amounts and typecast fields
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    df['type'] = df['type'].astype(str).str.lower()
    df['category'] = df['category'].astype(str).str.strip()
    
    # Impute missing values if any
    df['amount'] = df['amount'].fillna(0.0)
    df['description'] = df['description'].fillna('').astype(str)
    
    # Sort transactions chronologically
    df = df.sort_values('date').reset_index(drop=True)
    
    return df
