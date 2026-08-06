FROM python:3.10-slim

# ── Build argument for embedding the git commit at image build time ──────────
ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=${COMMIT_SHA}

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source and version metadata
COPY ai/ ./ai/
COPY VERSION ./VERSION

# Runtime environment variables
# PORT=7860 is the Hugging Face Spaces default. Override locally with PORT=8000.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    ENVIRONMENT=production

# Expose the service port (7860 = Hugging Face Spaces default)
EXPOSE 7860

# Health check — waits 30s for models to load, then polls every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/api/ai/health')" || exit 1

# Run uvicorn from the ai/ working directory so 'main:app' resolves correctly.
# Single worker to share the in-memory preloaded model state across requests.
WORKDIR /app/ai
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info"]
