/* ════════════════════════════════════════════
   Voice AI Customer Support — script.js
   ════════════════════════════════════════════ */

// ── State ────────────────────────────────────
let isRecording  = false;
let recognition  = null;
let synth        = window.speechSynthesis;
let currentSection = "dashboard";

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  loadMetrics();
  initSpeechRecognition();
});

// ════════════════════════════════════════════
// CLOCK
// ════════════════════════════════════════════
function startClock() {
  const el = document.getElementById("clock");
  setInterval(() => {
    el.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

// ════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById("section-" + name).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if (b.textContent.toLowerCase().includes(name)) b.classList.add("active");
  });

  currentSection = name;
  if (name === "history") refreshHistory();

  // Close sidebar on mobile
  if (window.innerWidth < 700) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ════════════════════════════════════════════
// SPEECH RECOGNITION
// ════════════════════════════════════════════
function initSpeechRecognition() {
  const SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecog) {
    document.getElementById("micStatus").textContent = "Mic not supported — use text input";
    document.getElementById("micBtn").disabled = true;
    return;
  }

  recognition = new SpeechRecog();
  recognition.continuous  = false;
  recognition.interimResults = false;
  recognition.lang        = "en-US";

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    document.getElementById("textInput").value = transcript;
    setMicStatus("Heard: " + transcript);
    stopRecording();
    processQuery(transcript);
  };

  recognition.onerror = (e) => {
    setMicStatus("Error: " + e.error + ". Use text input instead.");
    stopRecording();
  };

  recognition.onend = () => stopRecording();
}

function toggleRecording() {
  if (!recognition) { showToast("Speech API not supported in this browser.", "error"); return; }
  isRecording ? stopRecording() : startRecording();
}

function startRecording() {
  isRecording = true;
  document.getElementById("micBtn").classList.add("active");
  document.getElementById("micRing").classList.add("recording");
  document.getElementById("micIcon").className = "fa-solid fa-stop";
  setMicStatus("Listening… Speak now");
  recognition.start();
  showSection("assistant");
}

function stopRecording() {
  isRecording = false;
  document.getElementById("micBtn").classList.remove("active");
  document.getElementById("micRing").classList.remove("recording");
  document.getElementById("micIcon").className = "fa-solid fa-microphone";
  setMicStatus("Click to speak");
  try { recognition.stop(); } catch(_) {}
}

function setMicStatus(msg) {
  document.getElementById("micStatus").textContent = msg;
}

// ════════════════════════════════════════════
// TEXT INPUT
// ════════════════════════════════════════════
function sendText() {
  const input = document.getElementById("textInput").value.trim();
  if (!input) { showToast("Please enter a query.", "error"); return; }
  showSection("assistant");
  processQuery(input);
}

function setInput(text) {
  document.getElementById("textInput").value = text;
  showSection("assistant");
  document.getElementById("textInput").focus();
}

// Allow Enter key in text input
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement.id === "textInput") sendText();
});

// ════════════════════════════════════════════
// QUERY PROCESSING (calls Flask backend)
// ════════════════════════════════════════════
async function processQuery(text) {
  showLoading(true);
  clearResult();

  try {
    const res  = await fetch("/process", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text })
    });
    const data = await res.json();

    if (data.error) { showToast(data.error, "error"); showLoading(false); return; }

    renderResult(data, text);
    updateMetrics(data);
    addRecentItem(text, data);
    speakResponse(data.response);
    showToast("Response generated ✓", "success");

  } catch (err) {
    showToast("Connection error. Is Flask running?", "error");
    console.error(err);
  } finally {
    showLoading(false);
    document.getElementById("textInput").value = "";
  }
}

// ════════════════════════════════════════════
// RENDER RESULT
// ════════════════════════════════════════════
function renderResult(data, userText) {
  const box = document.getElementById("resultBox");
  box.innerHTML = `
    <div class="result-text">
      <p style="color:var(--muted);font-size:.78rem;margin-bottom:8px;">
        <i class="fa-solid fa-user"></i> You said: <em>"${escHtml(userText)}"</em>
      </p>
      <hr style="border-color:var(--border);margin-bottom:12px;" />
      <p style="font-size:1rem;line-height:1.7;">
        <i class="fa-solid fa-robot" style="color:var(--accent)"></i>
        &nbsp;${escHtml(data.response)}
      </p>
      <p style="color:var(--muted);font-size:.75rem;margin-top:12px;">
        <i class="fa-solid fa-clock"></i> ${data.timestamp}
      </p>
    </div>`;

  // Tags
  const tagsRow = document.getElementById("tagsRow");
  tagsRow.style.display = "flex";
  document.getElementById("tagLang").innerHTML    = `<i class="fa-solid fa-globe"></i> ${data.language}`;
  document.getElementById("tagIntent").innerHTML  = `<i class="fa-solid fa-bullseye"></i> ${data.intent}`;

  const sIcon = data.sentiment === "Positive" ? "face-smile" : data.sentiment === "Negative" ? "face-frown" : "face-meh";
  document.getElementById("tagSentiment").innerHTML = `<i class="fa-solid fa-${sIcon}"></i> ${data.sentiment}`;
}

function clearResult() {
  document.getElementById("resultBox").innerHTML = `
    <div class="result-placeholder">
      <i class="fa-solid fa-waveform-lines fa-2x"></i>
      <p>Processing…</p>
    </div>`;
  document.getElementById("tagsRow").style.display = "none";
}

// ════════════════════════════════════════════
// METRICS
// ════════════════════════════════════════════
async function loadMetrics() {
  try {
    const res  = await fetch("/metrics");
    const data = await res.json();
    updateMetricsUI(data.total, data.resolved, data.escalated, data.resolution_rate);
  } catch(_) {}
}

function updateMetrics(data) {
  const m = data.metrics;
  updateMetricsUI(m.total, m.resolved, m.escalated, data.resolution_rate);
}

function updateMetricsUI(total, resolved, escalated, rate) {
  animateNumber("m-total",    total);
  animateNumber("m-resolved", resolved);
  animateNumber("m-escalated",escalated);
  document.getElementById("m-rate").textContent = rate + "%";
}

function animateNumber(id, target) {
  const el  = document.getElementById(id);
  const cur = parseInt(el.textContent) || 0;
  if (cur === target) return;
  const step = Math.ceil(Math.abs(target - cur) / 12);
  let val = cur;
  const timer = setInterval(() => {
    val = val < target ? Math.min(val + step, target) : Math.max(val - step, target);
    el.textContent = val;
    if (val === target) clearInterval(timer);
  }, 40);
}

// ════════════════════════════════════════════
// HISTORY TABLE
// ════════════════════════════════════════════
async function refreshHistory() {
  try {
    const res  = await fetch("/history");
    const rows = await res.json();
    const tbody = document.getElementById("historyBody");

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No history yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.slice().reverse().map(r => `
      <tr>
        <td>${r.id}</td>
        <td style="white-space:nowrap">${r.timestamp}</td>
        <td>${escHtml(r.user)}</td>
        <td>${r.language}</td>
        <td>${r.intent}</td>
        <td>${r.sentiment || "—"}</td>
        <td>${escHtml(r.response)}</td>
        <td>
          <span class="status-badge ${r.escalated ? 'status-escalated' : 'status-resolved'}">
            ${r.escalated ? "Escalated" : "Resolved"}
          </span>
        </td>
      </tr>`).join("");
  } catch(e) {
    console.error(e);
  }
}

// ════════════════════════════════════════════
// RECENT ITEMS (dashboard)
// ════════════════════════════════════════════
function addRecentItem(userText, data) {
  const list = document.getElementById("recent-list");
  const placeholder = list.querySelector(".placeholder");
  if (placeholder) placeholder.remove();

  const div = document.createElement("div");
  div.className = "recent-item" + (data.intent === "Human Agent Request" ? " escalated" : "");
  div.innerHTML = `
    <div style="flex:1">
      <strong>${escHtml(userText.substring(0,60))}${userText.length>60?"…":""}</strong>
      <div class="recent-meta">${data.intent} &bull; ${data.language} &bull; ${data.timestamp}</div>
    </div>
    <span class="status-badge ${data.intent==="Human Agent Request"?"status-escalated":"status-resolved"}">
      ${data.intent==="Human Agent Request"?"Escalated":"Resolved"}
    </span>`;

  list.insertBefore(div, list.firstChild);

  // Keep last 6
  while (list.children.length > 6) list.removeChild(list.lastChild);
}

// ════════════════════════════════════════════
// HUMAN ESCALATION
// ════════════════════════════════════════════
async function escalate() {
  try {
    const res  = await fetch("/escalate", { method: "POST" });
    const data = await res.json();
    showToast("Transferred to a human agent ✓", "success");
    speakResponse("Your request is being transferred to a human support representative. Please hold.");
    updateMetrics({ metrics: data.metrics, resolution_rate:
      Math.round((data.metrics.resolved / data.metrics.total) * 100) });
  } catch(e) {
    showToast("Escalation error.", "error");
  }
}

// ════════════════════════════════════════════
// TEXT-TO-SPEECH
// ════════════════════════════════════════════
function speakResponse(text) {
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = "en-US";
  utter.rate  = 0.95;
  utter.pitch = 1;

  // Pick a pleasant voice if available
  const voices = synth.getVoices();
  const preferred = voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("female"))
    || voices.find(v => v.lang === "en-US")
    || voices[0];
  if (preferred) utter.voice = preferred;

  synth.speak(utter);
}

// ════════════════════════════════════════════
// DEMO QUERIES (from dashboard)
// ════════════════════════════════════════════
function loadDemo(text) {
  showSection("assistant");
  document.getElementById("textInput").value = text;
  setTimeout(() => processQuery(text), 300);
}

// ════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════
async function resetAll() {
  if (!confirm("Reset all demo data?")) return;
  await fetch("/reset", { method: "POST" });
  document.getElementById("recent-list").innerHTML =
    '<p class="placeholder">No conversations yet. Start by sending a query.</p>';
  updateMetricsUI(0, 0, 0, 0);
  document.getElementById("tagsRow").style.display = "none";
  document.getElementById("resultBox").innerHTML = `
    <div class="result-placeholder">
      <i class="fa-solid fa-waveform-lines fa-2x"></i>
      <p>Assistant response will appear here</p>
    </div>`;
  await refreshHistory();
  showToast("Demo data reset.", "info");
}

// ════════════════════════════════════════════
// LOADING OVERLAY
// ════════════════════════════════════════════
function showLoading(state) {
  document.getElementById("loadingOverlay").style.display = state ? "flex" : "none";
}

// ════════════════════════════════════════════
// TOAST NOTIFICATION
// ════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove("show"); }, 3500);
}

// ════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}
