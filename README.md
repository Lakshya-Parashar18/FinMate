# FinMate

A personal finance management platform with AI-powered transaction categorization, spending forecasting, anomaly detection, real-time email notification alerts, and financial health scoring.

---

## Architecture

FinMate runs as three modular, high-performance services:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────────┐
│   Client (Vite/React)   │────▶│  Server (Node/Express)  │────▶│   Backend (FastAPI/Python)  │
│   localhost:5173        │     │  localhost:5000         │     │   localhost:8000            │
│   Deployed: Vercel      │     │  Deployed: Render       │     │   Deployed: Render          │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────────┘
                                             │                                 │
                                             └─────────────────────────────────┘
                                                       MongoDB Atlas
```

| Service | Directory | Runtime | Purpose | Deployment |
|---------|-----------|---------|---------|------------|
| **Client** | `Client/` | React + Vite | Frontend UI, Glassmorphic Design, CustomSelect, CustomDatePicker | **Vercel** |
| **Server** | `server/` | Node.js + Express | REST API, Auth, MongoDB Queries, Real-Time Email Alerts, Cloudflare Security | **Render** |
| **Backend** | `backend/` | Python + FastAPI | AI Models, Categorization, Forecasting, Embeddings, Anomaly Detection | **Render** |

---

## ✨ Key Features & Recent Enhancements

- 🎨 **Glassmorphic Custom UI System**:
  - `CustomSelect`: Custom searchable select dropdowns with 45+ global country flags, popover width auto-fit, single-line text layout, and smart search input.
  - `CustomDatePicker`: Custom month/date calendar picker replacing native browser inputs.
- 📧 **Automated Real-Time Email & Alert Engine**:
  - **Budget Threshold Warnings**: Sends dark-themed HTML alert emails when category spending crosses **80%** (Amber Warning) or **100%** (Limit Exceeded).
  - **High-Value Expense Alerts**: Immediate warning email when a transaction amount exceeds user threshold (default: ₹10,000).
  - **Goal Milestone Celebrations**: Emerald emails celebrating **25%, 50%, 75%, and 100%** savings goal completion.
- ⚡ **Instant Synchronous Auth Hydration**:
  - 0ms frame-1 UI state hydration from local storage upon login, resolving sidebar delays and loading overlays.
- 🛡️ **Cloudflare Turnstile CAPTCHA Integration**:
  - Server-side `siteverify` token validation middleware protecting `/api/auth/login` and `/api/auth/register`.
- 🎨 **Sleek Light Mode Theme Scrollbars**:
  - Custom 8px emerald pill scrollbars with zero native browser arrow buttons.

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

### 1. Clone and install dependencies

```bash
git clone https://github.com/Lakshya-Parashar18/FinMate.git
cd FinMate
npm install
```

### 2. Configure environment variables

**Client (Vite Frontend): `Client/.env`**
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=your_turnstile_site_key
VITE_API_URL=http://localhost:5000
```

**Server (Node.js Server): `server/.env`**
```env
MONGO_URI=your_mongodb_connection_uri
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
EMAIL_USER=finmate.support01@gmail.com
EMAIL_PASS=your_gmail_app_password
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

**Backend (Python AI Service): `backend/.env`**
```env
MONGO_URI=your_mongodb_connection_uri
PORT=8000
ENVIRONMENT=development
```

### 3. Start all three services

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

The app will be live at **http://localhost:5173**.

---

## Environment Variable Reference

### `server/.env` (Node.js Server — Deployed on Render)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ Required | — | MongoDB Atlas connection URI |
| `JWT_SECRET` | ✅ Required | — | String for JWT signing |
| `SESSION_SECRET` | ✅ Required | — | Express session secret |
| `FRONTEND_URL` | ✅ Required | — | Frontend origin URL (e.g. `https://finmate-app.me`) |
| `EMAIL_USER` | ✅ Required | — | Gmail address for transactional email alerts |
| `EMAIL_PASS` | ✅ Required | — | Gmail App Password for SMTP dispatch |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | ✅ Required | testing key | Cloudflare Turnstile secret key |
| `AI_SERVICE_URL` | ✅ Required | — | URL of the Python AI service on Render |

### `Client/.env` (Vite Frontend — Deployed on Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | ✅ Required | Google OAuth Client ID |
| `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` | ✅ Required | Cloudflare Turnstile site key |
| `VITE_API_URL` | Optional | Backend server URL |

---

## Deployment (Vercel + Render)

| Service | Platform | Notes |
|---------|----------|-------|
| **Client (Frontend)** | **Vercel** | Configured via `vercel.json` and static build |
| **Server (Node API)** | **Render** | Node.js Web Service running `server.js` |
| **Backend (Python AI)** | **Render** | Web Service running FastAPI `uvicorn main:app` |

---

## License

Copyright © 2026 FinMate. All rights reserved.
