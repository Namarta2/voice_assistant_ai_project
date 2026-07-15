"""
Voice-Based Virtual Assistant for Multilingual Customer Support
Flask Backend - app.py
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os
import re
import csv
import io
import random
from datetime import datetime

app = Flask(__name__)
app.secret_key = "viva-ai-assistant-2026"

# ──────────────────────────────────────────────
# In-memory storage (no DB needed for viva demo)
# ──────────────────────────────────────────────
conversation_history = []
metrics = {
    "total": 0,
    "resolved": 0,
    "escalated": 0
}

# ──────────────────────────────────────────────
# Intent keyword map
# ──────────────────────────────────────────────
INTENT_PATTERNS = {
    "balance_inquiry": [
        "balance", "account balance", "check balance", "how much",
        "remaining balance", "account info", "statement"
    ],
    "subscription_cancel": [
        "cancel", "cancellation", "unsubscribe", "end subscription",
        "stop service", "terminate", "discontinue"
    ],
    "complaint": [
        "complaint", "complain", "unhappy", "dissatisfied", "problem",
        "issue", "bad service", "not working", "broken", "damaged", "frustrated"
    ],
    "internet_issue": [
        "internet", "wifi", "connection", "not connecting", "slow internet",
        "network", "no signal", "connectivity", "broadband", "router"
    ],
    "billing_issue": [
        "bill", "billing", "charge", "overcharged", "invoice", "payment",
        "refund", "extra charge", "wrong amount", "deduction"
    ],
    "human_agent": [
        "human", "agent", "representative", "person", "talk to someone",
        "speak to", "transfer", "real person", "customer service rep"
    ],
    "general_info": [
        "information", "tell me", "what is", "how do i", "help",
        "support", "services", "packages", "plans", "pricing", "offer"
    ]
}

# ──────────────────────────────────────────────
# Response templates
# ──────────────────────────────────────────────
RESPONSES = {
    "balance_inquiry": [
        "Your account balance inquiry has been recorded. Please verify your account number with our system. You can also check your balance via the self-service portal.",
        "I have noted your balance inquiry. For security, our team will send your account details to your registered email within a few minutes."
    ],
    "subscription_cancel": [
        "I understand you want to cancel your subscription. Your cancellation request has been registered. Our retention team will contact you shortly to assist with the process.",
        "Your subscription cancellation request has been received. Please note that you will retain access until the end of your billing cycle."
    ],
    "complaint": [
        "I sincerely apologize for the inconvenience you are experiencing. Your complaint has been registered with priority. A supervisor will follow up within 24 hours.",
        "Thank you for bringing this to our attention. Your complaint reference number is #CS-2026-{ref}. Our quality team will investigate and respond promptly."
    ],
    "internet_issue": [
        "I understand that you are facing connectivity issues. Please restart your router and wait 2 minutes. If the issue persists, our technical team will schedule a remote diagnosis.",
        "I am sorry to hear about your internet problem. Please try: 1) Restart your router, 2) Check all cables, 3) Move closer to the router. If still unresolved, a technician can be dispatched."
    ],
    "billing_issue": [
        "Your billing concern has been flagged for review. Our finance team will audit your account within 2 business days and issue corrections if applicable.",
        "I understand your concern regarding billing. A detailed invoice breakdown will be sent to your registered email. Any incorrect charges will be refunded within 5–7 business days."
    ],
    "human_agent": [
        "Your request is being transferred to a human support representative. Please hold on — an agent will be with you shortly.",
        "Connecting you to a live agent now. Average wait time is 3–5 minutes. Your reference number is #AGT-{ref}."
    ],
    "general_info": [
        "Thank you for reaching out! Our services include broadband internet, mobile plans, cloud storage, and 24/7 customer support. How can I assist you further?",
        "We offer a range of plans to suit your needs. Visit our website or speak to an agent for personalized recommendations. Is there anything specific you would like to know?"
    ]
}

SENTIMENT_LABELS = {
    "positive": ["great", "good", "thanks", "thank you", "appreciate", "happy", "love", "excellent", "perfect"],
    "negative": ["bad", "terrible", "awful", "worst", "hate", "angry", "frustrated", "disappointed", "useless"],
}

FAQ_KB = {
    "what are your working hours": "Our customer support is available 24/7, 365 days a year.",
    "how do i reset my password": "Visit the login page and click 'Forgot Password'. A reset link will be sent to your registered email.",
    "what payment methods do you accept": "We accept credit/debit cards, bank transfer, JazzCash, EasyPaisa, and cash payments at our service centers.",
    "how do i upgrade my plan": "Log into your account portal and go to 'Manage Plan' to upgrade. You can also call our sales line for assistance.",
}


# ──────────────────────────────────────────────
# Helper: detect language via simple heuristic
# ──────────────────────────────────────────────
URDU_CHARS = set("ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوہھیئءة")

def detect_language(text: str) -> str:
    """Detect whether text is Urdu or English based on character set."""
    urdu_count = sum(1 for ch in text if ch in URDU_CHARS)
    return "Urdu" if urdu_count > 2 else "English"


# ──────────────────────────────────────────────
# Helper: classify intent
# ──────────────────────────────────────────────
def classify_intent(text: str) -> str:
    """Match text against keyword patterns to determine intent."""
    lower = text.lower()
    scores = {}
    for intent, keywords in INTENT_PATTERNS.items():
        scores[intent] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general_info"


# ──────────────────────────────────────────────
# Helper: sentiment analysis (rule-based)
# ──────────────────────────────────────────────
def analyse_sentiment(text: str) -> str:
    lower = text.lower()
    pos = sum(1 for w in SENTIMENT_LABELS["positive"] if w in lower)
    neg = sum(1 for w in SENTIMENT_LABELS["negative"] if w in lower)
    if pos > neg:
        return "Positive"
    elif neg > pos:
        return "Negative"
    return "Neutral"


# ──────────────────────────────────────────────
# Helper: FAQ check
# ──────────────────────────────────────────────
def check_faq(text: str):
    lower = text.lower().strip("?")
    for q, a in FAQ_KB.items():
        if any(word in lower for word in q.split()):
            return a
    return None


# ──────────────────────────────────────────────
# Helper: generate response
# ──────────────────────────────────────────────
def generate_response(intent: str) -> str:
    ref = random.randint(1000, 9999)
    templates = RESPONSES.get(intent, RESPONSES["general_info"])
    response = random.choice(templates)
    return response.replace("{ref}", str(ref))


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/process", methods=["POST"])
def process_query():
    """
    Main endpoint: receives user text, detects language, classifies intent,
    generates response, stores history, updates metrics.
    """
    data = request.get_json()
    user_text = data.get("text", "").strip()
    if not user_text:
        return jsonify({"error": "Empty input"}), 400

    # FAQ shortcut
    faq_answer = check_faq(user_text)

    language   = detect_language(user_text)
    intent     = classify_intent(user_text)
    sentiment  = analyse_sentiment(user_text)
    response   = faq_answer if faq_answer else generate_response(intent)
    timestamp  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Map intent to readable label
    intent_labels = {
        "balance_inquiry":    "Balance Inquiry",
        "subscription_cancel":"Subscription Cancel",
        "complaint":          "Complaint",
        "internet_issue":     "Internet Issue",
        "billing_issue":      "Billing Issue",
        "human_agent":        "Human Agent Request",
        "general_info":       "General Information",
    }
    intent_label = intent_labels.get(intent, "General Information")

    # Update metrics
    metrics["total"] += 1
    if intent == "human_agent":
        metrics["escalated"] += 1
    else:
        metrics["resolved"] += 1

    # Store in history
    record = {
        "id":        metrics["total"],
        "user":      user_text,
        "language":  language,
        "intent":    intent_label,
        "sentiment": sentiment,
        "response":  response,
        "timestamp": timestamp,
        "escalated": intent == "human_agent"
    }
    conversation_history.append(record)

    return jsonify({
        "language":  language,
        "intent":    intent_label,
        "sentiment": sentiment,
        "response":  response,
        "timestamp": timestamp,
        "metrics":   metrics,
        "resolution_rate": round((metrics["resolved"] / metrics["total"]) * 100, 1) if metrics["total"] else 0
    })


@app.route("/escalate", methods=["POST"])
def escalate():
    """Log a manual human-agent escalation."""
    metrics["escalated"] += 1
    metrics["total"]     += 1
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    record = {
        "id":        metrics["total"],
        "user":      "[Manual Escalation]",
        "language":  "N/A",
        "intent":    "Human Agent Request",
        "sentiment": "N/A",
        "response":  "Transferred to a human agent successfully.",
        "timestamp": timestamp,
        "escalated": True
    }
    conversation_history.append(record)
    return jsonify({"message": "Escalated to human agent.", "metrics": metrics})


@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(conversation_history)


@app.route("/metrics", methods=["GET"])
def get_metrics():
    rate = round((metrics["resolved"] / metrics["total"]) * 100, 1) if metrics["total"] else 0
    return jsonify({**metrics, "resolution_rate": rate})


@app.route("/export", methods=["GET"])
def export_csv():
    """Export conversation log as CSV download."""
    si     = io.StringIO()
    writer = csv.DictWriter(si, fieldnames=["id","timestamp","user","language","intent","sentiment","response","escalated"])
    writer.writeheader()
    writer.writerows(conversation_history)
    output = si.getvalue()
    return app.response_class(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=conversation_log.csv"}
    )


@app.route("/reset", methods=["POST"])
def reset():
    """Reset all data (useful between viva demos)."""
    global conversation_history, metrics
    conversation_history = []
    metrics = {"total": 0, "resolved": 0, "escalated": 0}
    return jsonify({"message": "All data reset."})


@app.route("/static/audio/<path:filename>")
def serve_audio(filename):
    return send_from_directory(os.path.join(app.root_path, "static", "audio"), filename)


if __name__ == "__main__":
    print("=" * 55)
    print("  Voice-Based Virtual Assistant — AI Fundamentals")
    print("  Running at: http://127.0.0.1:5000")
    print("=" * 55)
    app.run(debug=True, port=5000)
