<div align="center">

<img src="https://img.shields.io/badge/WebPilot-AI%20Browser%20Agent-4f8ef7?style=for-the-badge&logo=googlechrome&logoColor=white" />

# ⚡ WebPilot

### An Autonomous AI Browser Agent that thinks, plans, and browses the web for you.

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white)](https://groq.com/)

[Demo](#demo) · [Features](#features) · [Architecture](#architecture) · [Setup](#setup) · [Usage](#usage)

</div>

---

## 🧠 What is WebPilot?

WebPilot is a full-stack **Agentic AI** application where a Large Language Model doesn't just chat — it **acts**. Give it a task in plain English and WebPilot autonomously:

- 🌐 Opens real browser tabs
- 🔍 Searches Google
- 📄 Reads and extracts page content
- 🖱️ Clicks buttons and fills forms
- 📊 Compares and analyzes results
- ✅ Returns a structured answer

> **Normal chatbot** → only generates text  
> **WebPilot** → thinks, decides, uses tools, and completes tasks step by step

---

## 🎯 Real-Life Example

**You type:**
```
Find the cheapest flight from Delhi to Mumbai for tomorrow
```

**WebPilot:**
1. 🔍 Searches Google for flight options
2. 🌐 Opens flight booking websites
3. 📄 Extracts prices and schedules
4. 📊 Compares all results
5. ✅ Returns the best option with details

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🧠 **LLM Brain** | Powered by Groq's LLaMA 3.3 70B — fast, free, powerful |
| 🌐 **Real Browser** | Playwright controls a real Chromium browser |
| 🔍 **Google Search** | Searches and parses live Google results |
| 📄 **Text Extraction** | Reads any webpage's visible content |
| 🖱️ **Click & Fill** | Interacts with buttons, inputs, and forms |
| 📸 **Screenshots** | Captures the browser at any point |
| 🔄 **Multi-Step Reasoning** | Breaks complex tasks into sequential steps |
| 💬 **Chat UI** | Clean terminal-style React interface |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│              (Chat UI · Vite · Tailwind)             │
└─────────────────────┬───────────────────────────────┘
                      │  HTTP POST /api/agent
┌─────────────────────▼───────────────────────────────┐
│               Express Backend (Node.js)              │
│                  REST API Server                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│            LangChain Agent (AgentExecutor)           │
│         LLaMA 3.3 70B via Groq API                   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │  Decide  │→│ Pick Tool│→│   Execute Tool       │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│           Playwright Browser Tools                   │
│  open_url · google_search · extract_page_text        │
│  click_element · fill_input · take_screenshot        │
└─────────────────────┬───────────────────────────────┘
                      │
              🌐 Real Websites
```

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Custom CSS (dark terminal theme)

**Backend**
- Node.js + Express
- Playwright (Chromium)

**AI Layer**
- LangChain (`langchain`, `@langchain/core`, `@langchain/groq`)
- Groq API — LLaMA 3.3 70B Versatile
- `DynamicStructuredTool` + `AgentExecutor`

---

## 🚀 Setup

### Prerequisites

- Node.js v18+
- A free [Groq API key](https://console.groq.com/keys)

### 1. Clone the repo

```bash
git clone https://github.com/SSrivastava18/WebPilot.git
cd WebPilot
```

### 2. Backend Setup

```bash
cd server
npm install
npx playwright install chromium
```

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

Once both servers are running, type any task in the chat:

```
Find hotels in Goa under ₹3000 with good ratings
```
```
Compare iPhone 15 prices across Flipkart and Amazon
```
```
Search for top 5 restaurants in Connaught Place, Delhi
```
```
Find the latest news about AI in India
```

WebPilot will autonomously browse the web and return results with a full breakdown of every action it took.

---

## 🔧 Agent Tools

| Tool | What it does |
|------|-------------|
| `google_search` | Searches Google, returns top 5 results |
| `open_url` | Opens any URL in the real browser |
| `extract_page_text` | Reads all visible text from the current page |
| `click_element` | Clicks any element by CSS selector |
| `fill_input` | Types into any input field |
| `take_screenshot` | Saves a screenshot of the current page |
| `get_page_info` | Gets the current page title and URL |

---

## 📁 Project Structure

```
WebPilot/
├── my-app/                  ← React Frontend
│   ├── src/
│   │   └── App.jsx          ← Main chat UI
│   └── package.json
│
└── server/                  ← Express Backend
    ├── server.js            ← API server
    ├── agent/
    │   └── agentRunner.js   ← LangChain agent + Playwright tools
    ├── screenshots/         ← Auto-saved screenshots
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

- **Agentic AI** — LLM autonomously decides which tools to use and in what order
- **Tool Calling** — structured function calling with Zod schema validation
- **Multi-Step Reasoning** — agent plans and executes a sequence of browser actions
- **Browser Automation** — real Chromium controlled via Playwright
- **Full-Stack AI App** — React + Express + LangChain working together

---

## 🛣️ Roadmap

- [ ] MongoDB task history / memory
- [ ] Real-time streaming of agent steps
- [ ] SerpAPI integration (bypass bot detection)
- [ ] Multi-tab browser support
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
