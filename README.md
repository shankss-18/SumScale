# OmniAid — Multimodal AI Life-Assistant

> Upload anything — a scan report, a voice note, a screenshot of a suspicious
> message, a dataset — and OmniAid extracts what's actually going on, asks the
> follow-up questions a smart human would ask, and tells you exactly what to do next.

**Three departments, one reasoning engine:** Health · Fraud & Hack Detection · Data Insights

---

## Project Structure

```
omniaid/
├── .env.example          ← every required env var (copy to .env)
├── .gitignore
├── README.md
├── backend/
│   ├── main.py           ← FastAPI entry point  (uvicorn main:app --reload)
│   ├── requirements.txt  ← pinned Python deps
│   ├── pytest.ini
│   ├── app/
│   │   ├── config.py     ← settings + fail-fast env validation
│   │   ├── middleware/
│   │   │   ├── logging_middleware.py
│   │   │   └── security_headers.py
│   │   ├── routers/
│   │   │   └── health.py
│   │   └── utils/
│   │       └── logger.py
│   └── tests/
│       ├── conftest.py
│       └── test_health.py
└── frontend/
    ├── package.json      ← pinned Node deps
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        └── i18n/
            └── index.js
```

---

## Quick Start

### 1 — Clone & create your `.env`

```bash
git clone <repo-url>
cd omniaid
cp .env.example .env
# Now open .env and fill in every value — the app will NOT start without them
```

**Required variables** (the app exits at startup if any are missing):

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey) |
| `SPEECH_TO_TEXT_API_KEY` | Google Cloud Speech-to-Text API key |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (for nearby doctor/helpline lookup) |
| `MONGODB_URL` | MongoDB connection string (`mongodb://localhost:27017` for local) |
| `JWT_SECRET_KEY` | Long random string — generate with `python -c "import secrets; print(secrets.token_hex(64))"` |
| `FRONTEND_URL` | Exact frontend origin for CORS — `http://localhost:5173` in dev |

### 2 — Backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Windows note: python-magic requires libmagic.
# Replace python-magic with python-magic-bin in requirements.txt, then re-install.

# Run the dev server (from the /backend directory)
uvicorn main:app --reload
```

Verify it's running: `curl http://localhost:8000/health` → `{"status":"ok",...}`

**Fail-fast test** — deliberately break a required key:
```bash
# Remove or blank out GEMINI_API_KEY in .env, then:
uvicorn main:app --reload
# You will see a clear startup error and the process will exit immediately.
```

### 3 — Run the test suite

```bash
cd backend
pytest -v
```

### 4 — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Security Notes

- `.env` is in `.gitignore` — **never commit it**
- CORS is configured to allow **only** `FRONTEND_URL` — never `*`
- Security headers (CSP, X-Frame-Options, nosniff, HSTS in production) are applied to every response
- Logs redact all sensitive fields automatically (passwords, tokens, file contents, health facts, fraud evidence)
- API docs (`/docs`, `/redoc`) are disabled in production (`ENVIRONMENT=production`)

---

## Environment Notes

- **MongoDB**: Install [MongoDB Community](https://www.mongodb.com/try/download/community) locally, or use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier
- **Google APIs**: Enable Speech-to-Text, Places API (New), and Maps JavaScript API in [Google Cloud Console](https://console.cloud.google.com/)
