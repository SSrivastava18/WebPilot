# ⚡ WebPilot

### An Autonomous AI Browser Agent that thinks, plans, and browses the web for you.

🌐 **Live Application:** https://web-pilot-amc7wngjf-saurabhs-projects-1c5b5d6b.vercel.app/login

---

[🚀 Live Demo](https://web-pilot-amc7wngjf-saurabhs-projects-1c5b5d6b.vercel.app/login) •
[✨ Features](#features) •
[🏗️ Architecture](#architecture) •
[🛠️ Tech Stack](#tech-stack) •
[🚀 Setup](#setup) •
[💡 Usage](#usage) •
[🛣️ Roadmap](#roadmap)

---

## What is WebPilot?

WebPilot is a full-stack **Agentic AI + Generative AI** application where a Large Language Model doesn't just answer questions—it actively performs research.

Give it any task in plain English and WebPilot autonomously:

* 🧠 Thinks about the task
* 🌐 Plans which websites to visit
* 🔍 Opens and analyzes relevant sources
* 📄 Extracts meaningful content
* 📊 Compares information across websites
* ✅ Returns a structured answer with recommendations

Unlike traditional chatbots that only generate text, WebPilot acts as an intelligent web research assistant.

---

## Features

| Feature                           | Description                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| 🧠 LLM URL Planner                | Uses AI to determine the most relevant websites for a query |
| 🌐 Browser Automation             | Opens and interacts with websites using Playwright          |
| 🔄 Smart Fallback                 | Automatically switches sources when websites fail           |
| 📄 Intelligent Content Extraction | Removes ads, navigation menus, and irrelevant content       |
| 📊 AI Summarization               | Generates concise comparisons and insights                  |
| 🏆 Best Recommendation            | Highlights the best result from gathered information        |
| 💬 Modern Chat Interface          | Clean and responsive React-based UI                         |
| 📋 Chat History                   | Stores conversations locally                                |
| 🔁 Cross Platform                 | Works across Windows, Linux, and macOS                      |

---

## Real-World Examples

### Travel Search

```text
Find the cheapest flight from Goa to Mumbai for tomorrow
```

WebPilot:

* Opens multiple flight comparison websites
* Extracts fares and travel details
* Compares options
* Recommends the cheapest flight

---

### Local Discovery

```text
Best places to visit in Bihar with ratings
```

WebPilot:

* Visits tourism websites
* Collects ratings and reviews
* Generates ranked recommendations

---

### Shopping Research

```text
Compare iPhone 15 prices across Flipkart and Amazon
```

WebPilot:

* Searches multiple e-commerce platforms
* Compares prices and offers
* Suggests the best deal

---

### News Research

```text
Latest news about AI regulation in India
```

WebPilot:

* Opens trusted news sources
* Extracts latest developments
* Provides a summarized report

---

## Architecture

```text
┌──────────────────────────────────────────────┐
│                React Frontend                │
│ Chat UI • History • Source Cards • Badges    │
└───────────────────┬──────────────────────────┘
                    │
                    │ POST /api/agent
                    ▼
┌──────────────────────────────────────────────┐
│            Express Backend (Node)            │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│                Agent Runner                  │
│                                              │
│ 1. Plan URLs                                 │
│ 2. Open Websites                             │
│ 3. Extract Content                           │
│ 4. Summarize Results                         │
│ 5. Return Recommendation                     │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│             Playwright Browser               │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
          Any Website on the Internet
```

---

## Agentic AI vs Generative AI

| Layer           | Type          | Responsibility                  |
| --------------- | ------------- | ------------------------------- |
| URL Planner     | Agentic AI    | Decides which websites to visit |
| Browser Control | Agentic AI    | Performs actions on websites    |
| Fallback Logic  | Agentic AI    | Handles failures and retries    |
| Summarizer      | Generative AI | Produces human-readable answers |

---

## Tech Stack

### Frontend

* React 18
* Vite
* Custom CSS
* Local Storage

### Backend

* Node.js
* Express.js
* Playwright

### AI Layer

* Groq API
* LLaMA 3.3 70B Versatile

---

## Setup

### Prerequisites

* Node.js v18 or newer
* Groq API Key
* Chrome, Edge, Firefox, Brave, or another supported browser

---

### Clone Repository

```bash
git clone https://github.com/SSrivastava18/WebPilot.git
cd WebPilot
```

---

### Backend Setup

```bash
cd server

npm install

npx playwright install
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

Start backend:

```bash
npm run dev
```

Expected output:

```text
GROQ_API_KEY: Loaded
Launching Browser
Server running at http://localhost:5000
```

---

### Frontend Setup

```bash
cd my-app

npm install

npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Usage

Start both frontend and backend servers.

Enter any natural language task:

```text
Find the cheapest flight from Goa to Mumbai tomorrow
```

```text
Top 5 restaurants in Connaught Place
```

```text
Best hotels in Manali under ₹2000
```

```text
Latest news about AI regulation in India
```

```text
Top GitHub repositories for learning system design
```

WebPilot automatically:

1. Understands your intent
2. Plans relevant websites
3. Collects information
4. Summarizes findings
5. Returns actionable recommendations

---

## Browser Detection

WebPilot automatically detects and launches the user's default browser.

### Windows

Uses registry-based detection:

```text
HKCU\Software\Microsoft\Windows\Shell\Associations
```

### macOS

Uses Launch Services bundle identifiers.

### Linux

Uses:

```bash
xdg-settings get default-web-browser
```

---

### Supported Browsers

| Browser        | Engine   |
| -------------- | -------- |
| Google Chrome  | Chromium |
| Microsoft Edge | Chromium |
| Brave          | Chromium |
| Opera          | Chromium |
| Firefox        | Firefox  |
| Safari         | WebKit   |

If detection fails, Playwright's Chromium is used as fallback.

---

## Fallback Strategy

```text
LLM Plans URLs
        │
        ▼
Open Target Website
        │
        ▼
Extraction Success?
      /   \
    Yes    No
     │      │
     ▼      ▼
 Continue  Try Homepage
               │
               ▼
        Still Failing?
           /      \
         Yes      No
          │        │
          ▼        ▼
 Next Source   Continue
          │
          ▼
All Sources Failed?
          │
          ▼
Google Search Fallback
```

---

## Project Structure

```text
WebPilot/
│
├── my-app/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── agent/
│   │   └── agentRunner.js
│   │
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## Environment Variables

| Variable     | Required | Description                 |
| ------------ | -------- | --------------------------- |
| GROQ_API_KEY | Yes      | API key from Groq           |
| PORT         | No       | Backend port (default 5000) |

---

## Key Concepts Demonstrated

* Agentic AI
* Generative AI
* Browser Automation
* LLM-Based Routing
* Multi-Source Research
* Smart Fallback Systems
* Playwright Automation
* React + Node Full-Stack Architecture

---

## Roadmap

* [ ] Streaming agent execution logs
* [ ] MongoDB-based persistent memory
* [ ] Multi-agent collaboration
* [ ] Parallel tab processing
* [ ] Voice input support
* [ ] Docker deployment
* [ ] ReAct planning loops
* [ ] Improved anti-bot handling

---

## Live Demo

Production Deployment:

https://web-pilot-amc7wngjf-saurabhs-projects-1c5b5d6b.vercel.app/login

---

## License

MIT License

Feel free to use, modify, and distribute this project.

---

## Author

**Saurabh Srivastava**

GitHub: https://github.com/SSrivastava18

If you found this project useful, consider giving it a ⭐ on GitHub.
