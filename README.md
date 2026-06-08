<div align="center">

<img src="https://img.shields.io/badge/WebPilot-AI%20Browser%20Agent-4f8ef7?style=for-the-badge&logo=googlechrome&logoColor=white" />

# ⚡ WebPilot

### An Autonomous AI Browser Agent that thinks, plans, and browses the web for you.

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white)](https://groq.com/)

[Demo](#demo) · [Features](#features) · [Architecture](#architecture) · [Setup](#setup) · [Usage](#usage)

</div>

---

## 🧠 What is WebPilot?

WebPilot is a full-stack **Agentic AI + GenAI** application where a Large Language Model doesn't just chat — it **acts**. Give it any task in plain English and WebPilot autonomously:

- 🧠 **Thinks** — the LLM reasons about your query and plans which websites to open
- 🌐 **Browses** — opens real tabs in **your system's default browser** (Chrome, Firefox, Edge, Brave, Safari)
- 📄 **Reads** — extracts meaningful content from each page, skipping ads and noise
- 📊 **Compares** — synthesizes data across multiple sources
- ✅ **Answers** — returns a structured, actionable summary with a top recommendation

> **Normal chatbot** → only generates text  
> **WebPilot** → reasons, plans URLs, opens real browser tabs, reads live pages, and summarizes findings

---

## 🎯 Real-Life Examples

**Flights:**
```
Find the cheapest flight from Goa to Mumbai for tomorrow
```
→ Opens Skyscanner, MakeMyTrip, Goibibo with pre-filled search • Compares prices • Returns cheapest option

**Places:**
```
Best places to visit in Bihar with ratings
```
→ Opens TripAdvisor, Incredible India, tourism boards • Extracts ratings & descriptions • Ranks top picks

**YouTube:**
```
Best YouTubers for machine learning
```
→ Opens YouTube search + top channel pages • Reads about, subscriber counts, content style • Recommends top 3

**Shopping:**
```
Compare iPhone 15 prices across Flipkart and Amazon
```
→ Opens both with search pre-filled • Extracts prices, offers, EMI • Highlights best deal

**Anything else:**
```
Latest news about AI regulation in India
```
→ LLM picks the right news sites automatically • Summarizes key developments

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🧠 **LLM URL Planner** | LLM decides which 3–4 websites to open per query — zero hardcoding |
| 🌐 **Default Browser** | Opens sites in your actual Chrome / Firefox / Edge / Brave / Safari |
| 🔄 **Smart Fallback** | If a site blocks or fails, automatically tries the next best source |
| 📄 **Smart Extraction** | Strips ads/nav/footers, targets semantic content areas for clean text |
| 📊 **LLM Summarizer** | Reads raw scraped content and writes a structured comparison |
| 🏆 **Best Pick** | Every response ends with a top recommendation |
| 💬 **Chat UI** | Clean dark-mode React interface with source cards and intent badges |
| 📋 **Chat History** | Conversations saved locally and accessible from the sidebar |
| 🔁 **Cross-Platform** | Browser detection works on Windows, macOS, and Linux |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│     Chat UI · Intent Badge · Source Cards · History  │
└─────────────────────┬───────────────────────────────┘
                      │  HTTP POST /api/agent
┌─────────────────────▼───────────────────────────────┐
│               Express Backend (Node.js)              │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  agentRunner.js                      │
│                                                      │
│  Step 1 ── planUrls()                                │
│             LLM reads query → generates 3-4 URLs     │
│             (any website, any category)              │
│                                                      │
│  Step 2 ── openAllSources()                          │
│             Playwright opens each URL in real browser│
│             Extracts clean text · Fallback on fail   │
│                                                      │
│  Step 3 ── summarizeResults()                        │
│             LLM reads scraped content → structured   │
│             comparison + 🏆 Best Pick                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│         System Default Browser (via Playwright)      │
│   Chrome · Firefox · Edge · Brave · Safari · Opera   │
└─────────────────────┬───────────────────────────────┘
                      │
              🌐 Any Website on the Internet
```

---

## 🧬 GenAI vs Agentic AI — How WebPilot Uses Both

| Layer | Type | What it does |
|-------|------|-------------|
| **URL Planner** | 🤖 Agentic AI | LLM autonomously decides which sites to open based on the query |
| **Summarizer** | ✨ GenAI | LLM generates a structured comparison from raw scraped text |
| **Fallback Logic** | 🤖 Agentic AI | Agent adapts when sites fail — retries, skips, finds alternatives |
| **Browser Control** | 🤖 Agentic AI | Playwright acts on the real web as an autonomous agent |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Custom CSS (dark theme, DM Sans font)

**Backend**
- Node.js + Express
- Playwright (controls your system's real browser)

**AI Layer**
- Groq API — LLaMA 3.3 70B Versatile
- Two-prompt pipeline: URL planning + result summarization

---

## 🚀 Setup

### Prerequisites

- Node.js v18+
- A free [Groq API key](https://console.groq.com/keys)
- Any browser installed (Chrome, Firefox, Edge, Brave — WebPilot auto-detects)

### 1. Clone the repo

```bash
git clone https://github.com/SSrivastava18/WebPilot.git
cd WebPilot
```

### 2. Backend Setup

```bash
cd server
npm install
npx playwright install
```

> `npx playwright install` installs browser drivers as fallback. WebPilot will still prefer your system browser.

Create a `.env` file inside `server/`:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

Start the server:

```bash
npm run dev
```

You should see:
```
GROQ_API_KEY: Loaded ✅
🌐 Launching: Google Chrome
✅ Google Chrome started
🚀 Server running at http://localhost:5000
```

### 3. Frontend Setup

```bash
cd my-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 💡 Usage

Once both servers are running, type any task — WebPilot handles the rest:

```
Find the cheapest flight from Goa to Mumbai for tomorrow
```
```
Best places to visit in Bihar with ratings
```
```
Best YouTubers for machine learning
```
```
Compare iPhone 15 prices across Flipkart and Amazon
```
```
Top 5 restaurants in Connaught Place, Delhi
```
```
Latest news about AI regulation in India
```
```
Best hotels in Manali under ₹2000
```
```
Top GitHub repos for learning system design
```

WebPilot figures out which websites to open, opens them in your browser, reads the content, and returns a full structured comparison.

---

## 🌐 How Browser Detection Works

WebPilot reads your OS-level default browser setting and launches that exact binary via Playwright — no bundled Chromium, no separate install needed.

| OS | How it detects |
|----|----------------|
| **Windows** | Reads `HKCU\...\UrlAssociations\https\UserChoice` from registry |
| **macOS** | Reads `com.apple.LaunchServices` bundle ID |
| **Linux** | Runs `xdg-settings get default-web-browser` |

Supported browsers and their Playwright engine mapping:

| Browser | Engine |
|---------|--------|
| Google Chrome | `chromium` |
| Microsoft Edge | `chromium` |
| Brave | `chromium` |
| Opera | `chromium` |
| Firefox | `firefox` |
| Safari (macOS) | `webkit` |

If detection fails, WebPilot gracefully falls back to Playwright's bundled Chromium.

---

## 🔄 Fallback Chain

WebPilot never gives up on a query:

```
LLM plans 3-4 URLs
    ↓
Try specific search URL
    ↓ (if blocked/failed)
Try site homepage
    ↓ (if still failed)
Skip to next planned source
    ↓ (if all sources fail)
Fall back to Google Search
```

Sites that repeatedly fail are tracked in memory and skipped automatically in future requests.

---

## 📁 Project Structure

```
WebPilot/
├── my-app/                  ← React Frontend
│   ├── src/
│   │   └── App.js           ← Chat UI with source cards, intent badges, history
│   └── package.json
│
└── server/                  ← Express Backend
    ├── server.js            ← API server
    ├── agent/
    │   └── agentRunner.js   ← LLM URL planner + Playwright browser control
    ├── .env                 ← Your API keys (not committed)
    └── package.json
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Get free at [console.groq.com](https://console.groq.com/keys) |
| `PORT` | ❌ No | Default: `5000` |

---

## 🧩 Key Concepts Demonstrated

- **Agentic AI** — LLM autonomously plans which URLs to visit based on any query
- **GenAI** — LLM generates structured summaries from raw scraped web content
- **LLM-Driven Routing** — zero hardcoded categories; the model decides everything
- **Browser Automation** — controls your real installed browser via Playwright
- **Smart Fallback** — multi-layer resilience when sites block or fail
- **Cross-Platform** — browser detection for Windows, macOS, and Linux
- **Full-Stack AI App** — React + Express + Groq LLM working together

---

## 🛣️ Roadmap

- [ ] Real-time streaming of agent steps to frontend
- [ ] MongoDB task history and memory across sessions
- [ ] SerpAPI / ScraperAPI integration to bypass aggressive bot detection
- [ ] Multi-tab parallel browsing for faster results
- [ ] ReAct loop — agent reads page, decides next action, loops
- [ ] Voice input support
- [ ] Docker deployment

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ by [SSrivastava18](https://github.com/SSrivastava18)

⭐ Star this repo if you found it useful!

</div>
