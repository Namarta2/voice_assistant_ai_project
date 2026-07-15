# 🎙️ Voice-Based Virtual Assistant for Multilingual Customer Support

> **AI Fundamentals — University Viva Project**  
> Subject: AI Fundamentals | Assessment: Lab Viva (Option B)

---

## 📌 Project Overview

A fully functional, web-based AI customer support assistant that:

- 🎤 Accepts **voice input** via the browser microphone
- 🌐 Detects **language** (English / Urdu)
- 🎯 Identifies **customer intent** (7 intent categories)
- 💬 Generates **intelligent responses**
- 🔊 **Speaks** every response using Text-to-Speech
- 📊 Shows a live **dashboard** with metrics
- 📜 Maintains full **conversation history**
- 📥 Exports logs as **CSV**

---

## 🗂️ Folder Structure

```
project/
├── app.py                  # Flask backend — all AI logic lives here
├── requirements.txt        # Python dependencies
├── README.md               # This file
│
├── templates/
│   └── index.html          # Single-page frontend (HTML5)
│
├── static/
│   ├── css/
│   │   └── style.css       # Dark-theme professional UI
│   ├── js/
│   │   └── script.js       # Voice capture, TTS, API calls
│   └── audio/              # (Reserved for future audio clips)
│
└── models/                 # (Reserved for any saved model files)
```

---

## ⚙️ Technology Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | HTML5, CSS3, JavaScript (Vanilla)       |
| Backend    | Python 3.10+, Flask 3.x                |
| Voice In   | Web Speech API (browser built-in)       |
| Language   | Custom Urdu character-set detection     |
| NLP/Intent | Rule-based keyword classifier           |
| TTS        | Web Speech Synthesis API (browser)      |
| Data Store | In-memory (list) — no DB required       |

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10 or higher
- pip
- A modern browser (Chrome recommended for best voice support)

### Step 1 — Clone / Extract the project
```bash
cd path/to/project
```

### Step 2 — Create a virtual environment (recommended)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### Step 3 — Install dependencies
```bash
pip install flask
# The core AI features (intent, language, TTS) run in the browser
# or via pure-Python logic — no GPU required.
```

> **Full install** (if you want the listed libraries for extension):
> ```bash
> pip install -r requirements.txt
> ```

### Step 4 — Run the application
```bash
python app.py
```

### Step 5 — Open in browser
```
http://127.0.0.1:5000
```

---

## 🎓 Viva Demonstration Guide

### Live Demo Flow (10–15 minutes)

1. **Dashboard** — show metrics cards (all zeros initially)
2. **Voice Assistant** — click mic → speak a query → show:
   - Detected language badge
   - Identified intent badge
   - Sentiment badge
   - Spoken response (TTS)
3. **Quick Demo Buttons** — on Dashboard, click preset queries:
   - Balance → Internet → Billing → Cancel → Human Agent → **Urdu query**
4. **History Table** — navigate to History → show full log
5. **Export CSV** — download the log
6. **Human Escalation** — click "Transfer to Human Agent"
7. **Reset** — clear data for a clean run

### Key AI Concepts to Explain in Viva

| Concept | Implementation in This Project |
|---------|-------------------------------|
| Speech Recognition | Web Speech API (`SpeechRecognition`) |
| Language Detection | Unicode Urdu character-set heuristic |
| Intent Classification | Weighted keyword matching |
| Sentiment Analysis | Positive/negative word list scoring |
| Text-to-Speech | `SpeechSynthesisUtterance` (browser) |
| NLP | Rule-based NLU pipeline |
| FAQ Knowledge Base | Dictionary lookup with partial matching |

---

## 🔌 API Endpoints (Flask Backend)

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/`          | Renders the main UI |
| POST | `/process`   | Main AI pipeline — returns language, intent, response |
| POST | `/escalate`  | Logs a manual human-agent transfer |
| GET  | `/history`   | Returns full conversation log (JSON) |
| GET  | `/metrics`   | Returns current dashboard metrics |
| GET  | `/export`    | Downloads conversation history as CSV |
| POST | `/reset`     | Clears all in-memory data |

---

## 🧠 Intent Categories

| Intent | Example Query |
|--------|--------------|
| Balance Inquiry | "I want to check my account balance" |
| Subscription Cancel | "I want to cancel my subscription" |
| Complaint | "I am very unhappy with the service" |
| Internet Issue | "My internet connection is not working" |
| Billing Issue | "I was overcharged on my bill" |
| Human Agent Request | "Transfer me to a real person" |
| General Information | "What services do you offer?" |

---

## ✨ Bonus Features Implemented

- [x] **Sentiment Analysis** — Positive / Negative / Neutral per query
- [x] **FAQ Knowledge Base** — 6 pre-loaded entries with keyword matching
- [x] **Urdu Language Support** — Unicode Urdu character detection
- [x] **Export CSV** — One-click conversation log download
- [x] **Demo Data Buttons** — Instant viva demo without typing
- [x] **Reset Button** — Clean slate between demo runs
- [x] **Animated Metrics** — Number counters animate on update
- [x] **Toast Notifications** — Success / error feedback
- [x] **Responsive UI** — Works on mobile/tablet

---

## 👥 GitHub Contribution Guide

Each team member must make at least **3 meaningful commits**:

```bash
git init
git add .
git commit -m "feat: initial project structure and Flask backend"

# Member 2
git add static/css/style.css
git commit -m "feat: dark-theme CSS with sidebar and card layout"

# Member 3
git add static/js/script.js
git commit -m "feat: voice recording, TTS, and API integration"

# Member 4
git add templates/index.html
git commit -m "feat: complete HTML template with all sections"
```

---

## 📝 License

For educational/academic use only — AI Fundamentals Lab Assessment 2026.
