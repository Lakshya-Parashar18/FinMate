# FinMate

A personal finance management platform with AI-powered transaction categorization, spending forecasting, anomaly detection, and financial health scoring.

---

## Architecture

FinMate runs as three independent services:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
│   Client (Vite/React)│────▶│  Server (Node/Express)│────▶│  Backend (FastAPI/Python)│
│   localhost:5173     │     │  localhost:5000        │     │  localhost:8000         │
│   Deployed: Vercel   │     │  Deployed: Vercel      │     │  Deployed: Railway/Fly  │
└─────────────────────┘     └──────────────────────┘     └────────────────────────┘
                                        │                            │
                                        └────────────────────────────┘
                                                  MongoDB Atlas
```

| Service | Directory | Runtime | Purpose |
|---------|-----------|---------|---------|
| **Client** | `Client/` | React + Vite | Frontend UI |
| **Server** | `server/` | Node.js + Express | REST API, auth, DB queries |
| **Backend** | `backend/` | Python + FastAPI | AI models, categorization, forecasting |

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18.x | For Client and Server |
| Python | 3.10 | For Backend AI service |
| MongoDB | Atlas or local | Connection URI required |
| npm | 9.x | Package management |
| pip | 23.x | Python package management |

---

## Local Development Setup

### 1. Clone and install root dependencies

```bash
git clone <repo-url>
cd FinMate
npm install
```

### 2. Configure environment variables

**Backend (Python AI service):**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set MONGO_URI
```

**Server (Node.js):**
```bash
cp server/.env.example server/.env
# Edit server/.env and fill in all required values
# Important: also set AI_SERVICE_URL=http://localhost:8000
```

**Client (Vite):**
```bash
cp Client/.env.example Client/.env   # if example exists
# Or create Client/.env with:
# VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
# VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=<your-turnstile-site-key>
```

### 3. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start all three services

Open **three separate terminals**:

**Terminal 1 — Python AI Service:**
```bash
cd backend/ai
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Node.js Server:**
```bash
cd server
npm start
```

**Terminal 3 — Vite Frontend:**
```bash
cd Client
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment Variable Reference

### `backend/.env` (Python AI Service)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ **Required** | — | MongoDB Atlas connection URI. Service **will not start** without this. |
| `PORT` | Optional | `8000` | Port for the FastAPI service |
| `ENVIRONMENT` | Optional | `development` | `development` or `production` |
| `COMMIT_SHA` | Optional | auto-detected | Git commit hash; set by Docker/CI builds |

### `server/.env` (Node.js Server)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ Required | — | MongoDB Atlas connection URI |
| `JWT_SECRET` | ✅ Required | — | Long random string for JWT signing |
| `SESSION_SECRET` | ✅ Required | — | Long random string for Express sessions |
| `GOOGLE_CLIENT_ID` | ✅ Required | — | Google OAuth 2.0 client ID |
| `AI_SERVICE_URL` | ✅ Required | — | URL of the Python AI service (e.g. `http://localhost:8000`) |
| `FRONTEND_URL` | ✅ Required | — | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `EMAIL_USER` | ✅ Required | — | Gmail address for transactional emails |
| `EMAIL_PASS` | ✅ Required | — | Gmail app password (not your account password) |
| `TWILIO_ACCOUNT_SID` | ✅ Required | — | Twilio Account SID for SMS auth |
| `TWILIO_AUTH_TOKEN` | ✅ Required | — | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | ✅ Required | — | Twilio phone number (E.164 format) |
| `GEMINI_API_KEY` | ✅ Required | — | Google Gemini API key for financial insights |
| `GROQ_API_KEY` | ✅ Required | — | Groq API key for analytics |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Optional | testing key | Cloudflare Turnstile secret |
| `PORT` | Optional | `5000` | Node.js server port |
| `NODE_ENV` | Optional | `development` | `development` or `production` |

### `Client/.env` (Vite Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | ✅ Required | Google OAuth Client ID (same as server) |
| `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` | ✅ Required | Cloudflare Turnstile site key |

---

## API Endpoints (AI Service)

### Health & Version

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/health` | Service health, model status, DB connectivity |
| `GET` | `/api/version` | Deployed version, commit hash, environment |

**`GET /api/ai/health` — example response:**
```json
{
  "status": "healthy",
  "uptime": 142.3,
  "database": "CONNECTED",
  "startup_validation": "PASSED",
  "readiness": "READY",
  "models": {
    "categorization_model": "LOADED",
    "financial_health_model": "LOADED",
    "embedding_model": "LOADED"
  },
  "version": { "version": "1.0.0", "commit": "a3f9d12", "environment": "production" }
}
```

**`GET /api/version` — example response:**
```json
{
  "version": "1.0.0",
  "commit": "a3f9d12",
  "environment": "production",
  "build_timestamp": "2026-08-06T12:30:00Z",
  "python_version": "3.10.14"
}
```

---

## Docker (AI Service)

The Python AI service can be containerized independently.

### Build

```bash
# From the project root — pass the current git commit as a build arg
docker build \
  --build-arg COMMIT_SHA=$(git rev-parse --short HEAD) \
  -t finmate-ai:latest \
  ./backend
```

### Run

```bash
docker run -p 8000:8000 \
  -e MONGO_URI="mongodb+srv://..." \
  -e ENVIRONMENT=production \
  finmate-ai:latest
```

### Environment injection

Do **not** mount a `.env` file into the container. Instead, inject environment variables directly via `-e` flags or your deployment platform's secret management (Railway, Fly.io, etc.).

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Client + Server | Vercel | Configured via `vercel.json` |
| AI Backend | Railway / Fly.io | Use the `backend/Dockerfile`; inject env vars via platform secrets |

### Required `server/.env` addition before deployment

Add this line to your production `server/.env` (or your Vercel environment variables):
```
AI_SERVICE_URL=<your-railway-or-flyio-backend-url>
```

---

## Known Gotchas

### Python import namespace collision
The `categorization/` module and the root `backend/ai/` module both define an `embeddings` package. `main.py` uses `sys.modules` injection and manual namespace merging to resolve this at startup. Do not rename or restructure the `embeddings/` directories without updating the dynamic loader in `main.py` (lines 25–73).

### Startup validation failure
If the Python service exits immediately on startup with a non-zero code, check:
1. Is `MONGO_URI` set in `backend/.env` or as an OS env var?
2. Is the MongoDB cluster accessible from your machine/container?
3. Check the structured JSON logs for `"Startup Validation FAILED"`.

### Cross-layer `.env` dependency (historical)
Prior to this refactor, `forecast/utils.py` and `anomaly/utils.py` path-crawled to `../../../server/.env` to find `MONGO_URI`. This was removed. Both modules now load from `backend/.env`. If you see `MONGO_URI not set` errors in the AI service, ensure `backend/.env` contains the URI.

### Model loading on cold start
The first startup takes 30–90 seconds for the embedding model (`all-MiniLM-L6-v2`) to download from HuggingFace. Subsequent starts use the cached model. The Docker `HEALTHCHECK` has a 60-second start period to account for this.
