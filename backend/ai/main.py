import os
import sys
import time
import json
import logging
import subprocess
import datetime
from contextlib import asynccontextmanager
from pathlib import Path

# Add paths right after current_dir in sys.path to prioritize local modules (like utils)
# over site-packages, while keeping root config/embeddings packages prioritized at index 0.
current_dir = Path(__file__).resolve().parent
for path in [
    current_dir / "forecast",
    current_dir / "anomaly",
    current_dir / "learning",
    current_dir / "learning/api",
    current_dir / "gateway",
    current_dir / "financial_health",
    current_dir / "categorization",
    current_dir / "categorization/api"
]:
    if str(path) not in sys.path:
        sys.path.insert(1, str(path))

# Dynamic resolution and namespace merging of colliding 'embeddings' packages
import importlib.util

sys.path.insert(0, str(current_dir))
import embeddings.embedding_service as top_emb_svc
import embeddings.embedding_store as top_emb_store

def load_module_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

try:
    # Load and register store first
    cat_emb_store = load_module_from_path(
        "categorization_embeddings_store", 
        current_dir / "categorization" / "embeddings" / "embedding_store.py"
    )
    # We do NOT override sys.modules for store and service to preserve the top-level modules,
    # but we still load their categorization implementations to extract the classes.
    
    # Load and register cache second
    cat_emb_cache = load_module_from_path(
        "embedding_cache", 
        current_dir / "categorization" / "embeddings" / "embedding_cache.py"
    )
    sys.modules["embeddings.embedding_cache"] = cat_emb_cache
    
    # Load service third
    cat_emb_svc = load_module_from_path(
        "categorization_embeddings_service", 
        current_dir / "categorization" / "embeddings" / "embedding_service.py"
    )
    
    # Make them accessible as attributes on the top-level embeddings package
    import embeddings
    embeddings.embedding_store = top_emb_store
    embeddings.embedding_cache = cat_emb_cache
    embeddings.embedding_service = top_emb_svc
    
    # Merge classes to satisfy absolute imports from categorization models/training
    top_emb_svc.EmbeddingService = cat_emb_svc.EmbeddingService
    top_emb_store.EmbeddingStore = cat_emb_store.EmbeddingStore
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.stderr.write(f"Warning: Failed to merge dynamic embeddings namespaces: {e}\n")

# Setup environment before imports
# Load from backend/.env first; if absent (Docker/prod), OS env vars take over.
from dotenv import load_dotenv
_backend_env = current_dir / ".." / ".env"
load_dotenv(dotenv_path=_backend_env, override=False)
load_dotenv(override=False)  # final fallback to process environment

# Structured JSON Logger Configuration
class StructuredJsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "level": record.levelname,
            "message": record.getMessage(),
            "name": record.name,
            "timestamp": self.formatTime(record, self.datefmt or "%Y-%m-%dT%H:%M:%SZ"),
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
# Clear existing handlers to avoid duplicates
for handler in list(root_logger.handlers):
    root_logger.removeHandler(handler)

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(StructuredJsonFormatter())
root_logger.addHandler(console_handler)

logger = logging.getLogger("FinMateAIService")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gateway.api_router import router as gateway_router
from forecast.routes import router as forecast_router
from anomaly.routes import router as anomaly_router
from learning.api.learning_routes import router as learning_router
from financial_health.routes import router as health_router
from categorization.api.routes import router as categorization_router

# ---------------------------------------------------------------------------
# Version info — resolved once at process start
# ---------------------------------------------------------------------------
def _resolve_version_info() -> dict:
    """Collect version metadata at startup. All fields fall back gracefully."""
    # Read VERSION file from backend/ (two levels up from backend/ai/)
    version_file = current_dir / ".." / "VERSION"
    try:
        version = version_file.read_text(encoding="utf-8").strip()
    except OSError:
        version = "unknown"

    # Commit hash: prefer COMMIT_SHA env var (set by Docker/CI), then git
    commit = os.environ.get("COMMIT_SHA", "")
    if not commit:
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True, timeout=3,
                cwd=str(current_dir)
            )
            commit = result.stdout.strip() if result.returncode == 0 else "unknown"
        except Exception:
            commit = "unknown"

    return {
        "version": version,
        "commit": commit,
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "build_timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "python_version": sys.version.split()[0],
    }

VERSION_INFO = _resolve_version_info()

# State variables for preloaded models
preloaded_models = {
    "categorization": False,
    "financial_health": False,
    "embeddings": False
}

# Set to True only after _validate_startup() passes — gates the health endpoint
startup_validation_passed: bool = False

START_TIME = time.time()

# ---------------------------------------------------------------------------
# Startup validation
# ---------------------------------------------------------------------------
def _validate_startup() -> None:
    """
    Validates required environment and infrastructure before the service
    accepts traffic. Raises RuntimeError on fatal failures so Uvicorn exits
    with a non-zero code rather than silently degrading.
    """
    logger.info("=== FinMate AI Service — Startup Validation ===")

    # --- 1. Required environment variables ---
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError(
            "Startup validation FAILED: MONGO_URI is not set. "
            "Add it to backend/.env or inject it as an environment variable."
        )
    logger.info("[PASS] MONGO_URI is set.")

    for optional_var, default in [("PORT", "8000"), ("ENVIRONMENT", "development")]:
        val = os.environ.get(optional_var)
        if not val:
            logger.warning(f"[WARN] {optional_var} not set — defaulting to '{default}'.")
        else:
            logger.info(f"[PASS] {optional_var}={val}")

    # --- 2. MongoDB connectivity ---
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        client.close()
        logger.info("[PASS] MongoDB connectivity confirmed.")
    except Exception as exc:
        raise RuntimeError(
            f"Startup validation FAILED: Cannot reach MongoDB. "
            f"Check MONGO_URI and network access. Detail: {exc}"
        ) from exc

    logger.info("=== Startup Validation PASSED ===")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global startup_validation_passed

    # --- Phase 1: Startup validation (env vars + DB connectivity) ---
    try:
        _validate_startup()
        startup_validation_passed = True
    except RuntimeError as e:
        logger.error(str(e))
        # Re-raise so Uvicorn shuts down with a non-zero exit code
        raise

    # --- Phase 2: Model pre-warming ---
    logger.info("Pre-warming all global AI models on startup...")

    # 1. Load categorization model
    try:
        from categorization.models.model_loader import ModelLoader
        ModelLoader.load_model()
        preloaded_models["categorization"] = True
        logger.info("Categorization model preloaded successfully.")
    except Exception as e:
        logger.warning(f"Categorization model failed to preload (degraded mode): {e}")

    # 2. Load financial health model
    try:
        from financial_health.model_loader import HealthModelLoader
        HealthModelLoader().load_model()
        preloaded_models["financial_health"] = True
        logger.info("Financial Health model preloaded successfully.")
    except Exception as e:
        logger.warning(f"Financial Health model failed to preload (degraded mode): {e}")

    # 3. Load embeddings model
    try:
        from embeddings.embedding_service import platform_embedding_service
        _ = platform_embedding_service._get_model(platform_embedding_service.default_model_name)
        preloaded_models["embeddings"] = True
        logger.info("Embedding model preloaded successfully.")
    except Exception as e:
        logger.warning(f"Embedding model failed to preload (degraded mode): {e}")

    logger.info(
        "Service ready — categorization=%s, health=%s, embeddings=%s",
        preloaded_models["categorization"],
        preloaded_models["financial_health"],
        preloaded_models["embeddings"],
    )

    yield
    logger.info("Shutting down FinMate AI Service.")

app = FastAPI(
    title="FinMate AI Platform",
    description="Unified API for FinMate AI transaction categorization, anomaly detection, forecasting, and financial intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend and Node.js server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include sub-routers from feature modules
app.include_router(gateway_router)
app.include_router(forecast_router)
app.include_router(anomaly_router)
app.include_router(learning_router)
app.include_router(health_router)
app.include_router(categorization_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "FinMate AI Platform Service",
        "version": VERSION_INFO["version"],
    }

@app.get("/api/version")
@app.get("/version")
def api_version():
    """Returns deployed version metadata for debugging and deployment verification."""
    return VERSION_INFO

@app.get("/api/ai/health")
@app.get("/health")
def api_health():
    # Live DB check on every health poll
    db_status = "DISCONNECTED"
    try:
        from forecast.utils import get_db_client
        client = get_db_client()
        client.admin.command("ping")
        db_status = "CONNECTED"
        client.close()
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    # Service is only READY if startup validation passed AND core models are loaded
    models_ready = preloaded_models["categorization"] and preloaded_models["embeddings"]
    is_ready = startup_validation_passed and models_ready

    return {
        "status": "healthy" if is_ready else "degraded",
        "uptime": round(time.time() - START_TIME, 2),
        "database": db_status,
        "startup_validation": "PASSED" if startup_validation_passed else "FAILED",
        "readiness": "READY" if is_ready else "NOT_READY",
        "models": {
            "categorization_model": "LOADED" if preloaded_models["categorization"] else "NOT_LOADED",
            "financial_health_model": "LOADED" if preloaded_models["financial_health"] else "NOT_LOADED",
            "embedding_model": "LOADED" if preloaded_models["embeddings"] else "NOT_LOADED",
        },
        "version": VERSION_INFO,
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting unified FastAPI server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
