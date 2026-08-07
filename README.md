# 🌟 SumScale — Multimodal AI Life-Assistant

> **Reach your data in any format.**
> SumScale is a next-generation Multimodal AI Life-Assistant that converts complex documents, live voice notes, scanned medical reports, financial datasets, and suspicious messages into instant, actionable real-world solutions.

---

## 🚀 Overview

### The Problem
Every day, individuals and businesses struggle with unorganized, multi-format data:

1. **Medical & Technical Reports** — Complex lab tests and PDFs filled with jargon that non-experts cannot interpret quickly.
2. **Vernacular & Audio Barriers** — Millions of users communicate via regional spoken dialects or voice notes rather than typed text.
3. **Cyber Fraud & Scams** — Increasing prevalence of fake invoices, phishing messages, and impersonation attempts targeting non-technical users.

### The Solution
**SumScale** unifies **Document Digitisation**, **Speech & Voice Intelligence**, and a **Fraud & Security Shield** into a single seamless, vernacular-ready platform powered by **Google Gemini Multimodal AI** and **Groq LLaMA 3.3 70B**.

**🔗 Live Demo:** [sum-scale.vercel.app](https://sum-scale.vercel.app)

---

## ✨ Key Capabilities

### 1. 📄 Document Digitisation & Deep Analysis
- Extracts text, tables, key metrics, and structured facts from **PDFs, Scanned Reports, Images, and Financial CSV Datasets**.
- Automated anomaly detection for medical reports, legal contracts, and financial statements.

### 2. 🎙️ Speech & Voice Notes Engine
- Native browser microphone capture (`HTML5 MediaRecorder`) with live waveform visualization.
- Instant multilingual Speech-to-Text transcription and contextual AI summarization.

### 3. 🛡️ Fraud & Security Shield
- Scans screenshots and text of suspicious messages, emails, and fake invoices.
- Evaluates phishing probability, identifies impersonation patterns, and outputs clear step-by-step remediation advice.

### 4. 🔑 Passwordless Email OTP Authentication
- Secure 6-digit verification code sent directly to a user's registered email address.
- Pre-registration check auto-detects user status on login, prompting unregistered users to sign up first.

### 5. 🌐 Vernacular Multilingual Support (i18n)
- Native translation toggle supporting **English (US), Hindi (हिंदी), Telugu (తెలుగు), Tamil (தமிழ்), and Kannada (ಕన್నడ)** across all pages and AI responses.

### 6. 💬 Interactive Context-Aware Document Copilot
- Dynamic floating AI assistant capable of answering follow-up queries on uploaded cases in natural, empathetic, multi-paragraph responses.

---

## 🛠️ Architecture & Technology Stack

```
                              ┌───────────────────────────────────┐
                              │    React 18 + Vite (Tailwind)     │
                              │     Dual-Theme + i18n Vernacular  │
                              └─────────────────┬─────────────────┘
                                                │ REST API / JSON
                                                ▼
                              ┌───────────────────────────────────┐
                              │      FastAPI Python Backend       │
                              │    (Async Motor + Pydantic v2)    │
                              └────────┬─────────────────┬────────┘
                                       │                 │
           ┌───────────────────────────┴─┐             ┌─┴───────────────────────────┐
           │      AI Engine Layer        │             │  Authentication & Database  │
           │  • Google Gemini 1.5/2.0    │             │  • SMTP Email OTP Transport │
           │  • Groq LLaMA 3.3 70B       │             │  • PyJWT Session Management │
           │  • Google Speech-to-Text    │             │  • MongoDB Atlas Cloud      │
           └─────────────────────────────┘             └─────────────────────────────┘
```

| Layer | Details |
|---|---|
| **Frontend** | **React 18** + **Vite** for lightning-fast page loads, styled with **Tailwind CSS** using a curated Ocean Teal palette (`#006D77`, `#83C5BE`). Includes **i18next** for instant language switching. |
| **Backend** | **FastAPI (Python 3.11)** handles file uploads, user requests, email OTP generation, and securely communicates with MongoDB and AI models asynchronously. |
| **Database** | **MongoDB Atlas** (cloud database) securely storing encrypted user profiles, uploaded case reports, and chat histories. |
| **AI Core** | **Google Gemini SDK** analyzes uploaded PDFs, images, charts, and audio files. **Groq LLaMA 3.3 70B** provides instant, ultra-low-latency real-time chat responses. |
| **Authentication** | Passwordless 6-digit **SMTP Email OTP** verification + **PyJWT** for secure user sessions. |

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/send-otp` | Pre-checks user existence & dispatches 6-digit OTP to user's email |
| `POST` | `/api/auth/verify-otp` | Verifies 6-digit OTP code & returns JWT access token |
| `GET` | `/api/auth/me` | Fetches authenticated user profile |
| `POST` | `/api/cases/upload` | Processes uploaded file (PDF/Image/Audio/CSV) with Gemini Multimodal AI |
| `GET` | `/api/cases/` | Lists user cases with status & department categorization |
| `GET` | `/api/cases/{id}` | Retrieves detailed analysis report for a specific case |
| `POST` | `/api/chat/message` | Sends follow-up message to Groq/Gemini AI chatbot |
| `GET` | `/health` | Healthcheck endpoint verifying MongoDB & AI service connections |

---

## 💻 Local Quickstart Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **MongoDB Atlas** or local MongoDB instance

### 1. Clone & Configure Environment
```bash
git clone https://github.com/shankss-18/SumScale.git
cd SumScale
```

Create a `backend/.env` file:
```ini
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
SPEECH_TO_TEXT_API_KEY=your_speech_key
GOOGLE_PLACES_API_KEY=your_places_key
MONGODB_URL=your_mongodb_connection_string
MONGODB_DB_NAME=omniaid
JWT_SECRET_KEY=your_64_char_random_jwt_secret
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
LOG_LEVEL=INFO
PORT=8000
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 2. Start the Backend Server
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend runs on `http://localhost:8000` (API docs available at `http://localhost:8000/docs`)*

### 3. Start the Frontend App
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🗺️ Roadmap

### 🔮 Upcoming Features

- **Trust Circle** — Users will be able to add trusted contacts (friends/family) and, with one click, share an AI-generated risk alert summary directly from a case's chat conversation — e.g. instantly warning a family member about a detected fraud attempt or health risk flagged in their own case. Alerts will be scoped to only the specific AI response shared, never raw uploaded evidence, keeping the same per-user/per-case data isolation already enforced elsewhere in the app.

---

## 🌐 Live Cloud Deployment

- **Frontend Hosting**: [Vercel](https://sum-scale.vercel.app) (`frontend` root directory, Vite preset, `VITE_API_BASE_URL` env variable)
- **Backend Hosting**: **Render Web Service** (Python 3.11 environment, `backend` root directory, `uvicorn main:app --host 0.0.0.0 --port $PORT`)
- **Database**: **MongoDB Atlas** (IP access `0.0.0.0/0` enabled for cloud service instances)

---

## 🏆 Impact Metrics

- **⚡ < 3s AI Response Time** — Ultra-fast document parsing and streaming chat powered by Groq & Gemini.
- **🔒 100% Passwordless Security** — Frictionless Email OTP login eliminating password breaches.
- **🗣️ Vernacular Reach** — Native support for 5 major regional languages bridging the digital divide.
- **🎯 90%+ Accuracy** — Multimodal structured fact extraction across health, legal, and security domains.

---

## 📄 License
All rights reserved by **Team SumScale**.
