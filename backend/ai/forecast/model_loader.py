import os
import joblib
import sys

# Get direct paths for trained models directory
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
MODEL_DIR = os.path.join(project_root, "backend", "trained_models")
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_forecast.joblib")

def save_model(model, features_list):
    """Saves the trained model and associated feature names."""
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)
    
    payload = {
        'model': model,
        'features': features_list
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"Model saved successfully to {MODEL_PATH}", file=sys.stderr)

def load_model():
    """Loads the model if it exists, otherwise returns None."""
    if os.path.exists(MODEL_PATH):
        try:
            payload = joblib.load(MODEL_PATH)
            return payload['model'], payload['features']
        except Exception as e:
            print(f"Error loading model from {MODEL_PATH}: {e}", file=sys.stderr)
    return None, None
