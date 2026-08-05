import os
import sys
import joblib

# Paths configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
MODEL_DIR = os.path.join(project_root, "backend", "trained_models")

def get_model_path(user_id):
    """Get the model file path for the specific user."""
    return os.path.join(MODEL_DIR, f"anomaly_{user_id}.joblib")

def save_user_model(user_id, model, feature_cols, scaler_params, num_transactions):
    """Saves user's model payload using joblib."""
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)
        
    payload = {
        'model': model,
        'features': feature_cols,
        'scaler_params': scaler_params,
        'num_transactions': num_transactions
    }
    path = get_model_path(user_id)
    joblib.dump(payload, path)
    print(f"Model saved successfully for user {user_id} to {path}", file=sys.stderr)

def load_user_model(user_id):
    """Loads user's model payload if it exists."""
    path = get_model_path(user_id)
    if os.path.exists(path):
        try:
            payload = joblib.load(path)
            return (
                payload.get('model'),
                payload.get('features'),
                payload.get('scaler_params'),
                payload.get('num_transactions', 0)
            )
        except Exception as e:
            print(f"Error loading model from {path}: {e}", file=sys.stderr)
    return None, None, None, 0
