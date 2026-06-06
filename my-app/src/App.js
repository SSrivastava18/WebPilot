import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Find the cheapest flight from Goa to Mumbai for tomorrow",
  "Find hotels in Goa under ₹3000 with good ratings",
  "Compare iPhone 15 prices across Flipkart and Amazon",
  "Search for top 5 restaurants in Connaught Place",
];

const CATEGORY_META = {
  flights:    { icon: "✈️", color: "#3b82f6", label: "Flights" },
  hotels:     { icon: "🏨", color: "#8b5cf6", label: "Hotels" },
  restaurants:{ icon: "🍽️", color: "#f59e0b", label: "Restaurants" },
  shopping:   { icon: "🛍️", color: "#10b981", label: "Shopping" },
  general:    { icon: "🔍", color: "#6b7280", label: "Search" },
};

// ── Typing indicator ─────────────────────────────────────

function TypingDots() {
  return (
    <span className="typing-dots">
      <span /><span /><span />
    </span>
  );
}

// ── Source card ───────────────────────────────────────────

function SourceCard({ step, index }) {
  return (
    <a
      href={step.url}
      target="_blank"
      rel="noreferrer"
      className="source-card"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <span className="source-icon">🌐</span>
      <span className="source-name">{step.site}</span>
      <span className="source-check">✓</span>
    </a>
  );
}

// ── Formatted result ──────────────────────────────────────

function FormattedResult({ text }) {
  if (!text) return null;

  // Split into lines and render with basic markdown-like formatting
  const lines = text.split("\n");

  return (
    <div className="formatted-result">
      {lines.map((line, i) => {
        if (line.startsWith("## ") || line.startsWith("# ")) {
          return <h3 key={i} className="res-h3">{line.replace(/^#+\s/, "")}</h3>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="res-bold">{line.replace(/\*\*/g, "")}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <p key={i} className="res-bullet">• {line.replace(/^[-•]\s/, "")}</p>;
        }
        if (line.startsWith("🏆")) {
          return <p key={i} className="res-winner">{line}</p>;
        }
        if (line.startsWith("━")) {
          return <hr key={i} className="res-divider" />;
        }
        if (line.trim() === "") {
          return <div key={i} className="res-spacer" />;
        }
        return <p key={i} className="res-line">{line}</p>;
      })}
    </div>
  );
}

// ── Intent badge ──────────────────────────────────────────

function IntentBadge({ intent }) {
  if (!intent?.category) return null;
  const meta = CATEGORY_META[intent.category] || CATEGORY_META.general;

  const parts = [];
  if (intent.origin && intent.destination) {
    parts.push(`${intent.origin} → ${intent.destination}`);
  }
  if (intent.location) parts.push(intent.location);
  if (intent.product) parts.push(intent.product);
  if (intent.budget) parts.push(`Budget: ${intent.budget}`);

  return (
    <div className="intent-badge" style={{ borderColor: meta.color + "44", background: meta.color + "18" }}>
      <span className="intent-icon">{meta.icon}</span>
      <span className="intent-label" style={{ color: meta.color }}>{meta.label}</span>
      {parts.length > 0 && (
        <span className="intent-details">{parts.join(" · ")}</span>
      )}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────

function Message({ msg }) {
  const isUser = msg.role === "user";
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`message-row ${isUser ? "user" : "agent"}`}>
      {!isUser && <div className="avatar agent-avatar">⚡</div>}

      <div className={`bubble ${isUser ? "user-bubble" : "agent-bubble"}`}>

        {/* Intent badge */}
        {msg.intent && <IntentBadge intent={msg.intent} />}

        {/* Source cards */}
        {msg.steps && msg.steps.length > 0 && (
          <div className="sources-section">
            <p className="sources-label">
              🌐 Browsed {msg.steps.length} source{msg.steps.length > 1 ? "s" : ""}
            </p>
            <div className="sources-row">
              {msg.steps.map((step, i) => (
                <SourceCard key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Typing or content */}
        {msg.typing ? (
          <div className="typing-wrap">
            <span className="typing-label">Browsing the web</span>
            <TypingDots />
          </div>
        ) : (
          <>
            {/* Summary */}
            {msg.content && (
              <div className="summary-section">
                <FormattedResult text={msg.content} />
              </div>
            )}
          </>
        )}
      </div>

      {isUser && <div className="avatar user-avatar">U</div>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("webpilot-chat");
      return saved ? JSON.parse(saved) : [
        {
          id: 1,
          role: "agent",
          content: "Welcome to WebPilot.\n\nI browse the web in real-time — flights, hotels, restaurants, products, and more. Ask me to research anything.",
        },
      ];
    } catch { return [{ id: 1, role: "agent", content: "Welcome to WebPilot.\n\nI browse the web in real-time." }]; }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("webpilot-history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState("chat");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("webpilot-chat", JSON.stringify(messages)); } catch { }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("webpilot-history", JSON.stringify(history)); } catch { }
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveToHistory = (msgs, query) => {
    const item = {
      id: Date.now(),
      title: query.length > 48 ? query.slice(0, 48) + "…" : query,
      date: new Date().toLocaleString(),
      messages: msgs,
    };
    setHistory((prev) => [item, ...prev.slice(0, 29)]);
  };

  const openHistory = (chat) => {
    setMessages(chat.messages);
    setSelectedChatId(chat.id);
    setActiveTab("chat");
  };

  const newChat = () => {
    setMessages([{
      id: Date.now(),
      role: "agent",
      content: "New session started.\n\nWhat would you like me to research?",
    }]);
    setSelectedChatId(null);
    setActiveTab("chat");
  };

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    setInput("");
    const userMsg = { id: Date.now(), role: "user", content: query };
    const typingId = Date.now() + 1;

    setMessages((prev) => [...prev, userMsg, {
      id: typingId, role: "agent", typing: true, content: "",
    }]);

    setLoading(true);
    setAgentStatus("Parsing intent…");

    try {
      // Streaming status updates
      const statusTimer = setTimeout(() => setAgentStatus("Browsing sources…"), 1500);
      const statusTimer2 = setTimeout(() => setAgentStatus("Extracting data…"), 5000);
      const statusTimer3 = setTimeout(() => setAgentStatus("Analyzing results…"), 12000);

      const res = await fetch("http://localhost:5000/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: query }),
      });

      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      clearTimeout(statusTimer3);

      const data = await res.json();

      const agentMsg = {
        id: typingId,
        role: "agent",
        typing: false,
        steps: data.steps || [],
        content: data.summary || "Task completed.",
        intent: data.intent || {},
      };

      setMessages((prev) => {
        const updated = prev.map((m) => m.id === typingId ? agentMsg : m);
        saveToHistory(updated, query);
        return updated;
      });

    } catch (err) {
      setMessages((prev) => prev.map((m) => m.id === typingId ? {
        id: typingId,
        role: "agent",
        typing: false,
        content: "Could not connect to WebPilot backend.\n\nMake sure the server is running on port 5000.",
        steps: [],
      } : m));
    }

    setLoading(false);
    setAgentStatus("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <div className="logo-mark">⚡</div>
            <div>
              <div className="logo-name">WebPilot</div>
              <div className="logo-sub">AI Browser Agent</div>
            </div>
          </div>

          <button className="new-chat-btn" onClick={newChat}>
            + New Research
          </button>

          <nav className="sidebar-nav">
            {[
              { id: "chat",    icon: "💬", label: "Chat" },
              { id: "history", icon: "📋", label: "History" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {activeTab === "history" ? (
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-history">No history yet</p>
              ) : (
                history.map((chat) => (
                  <button
                    key={chat.id}
                    className={`history-item ${selectedChatId === chat.id ? "selected-history" : ""}`}
                    onClick={() => openHistory(chat)}
                  >
                    <div className="history-title">{chat.title}</div>
                    <div className="history-date">{chat.date}</div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="sidebar-status">
              <div className="status-dot" />
              <span>Agent {loading ? agentStatus || "working…" : "ready"}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <div className="topbar">
          <div className="topbar-info">
            <h1>WebPilot <span className="topbar-badge">AI</span></h1>
            <p>Real-time browser agent · Flights, Hotels, Shopping & More</p>
          </div>
          {loading && (
            <div className="status-pill">
              <div className="status-dot pulse" />
              {agentStatus || "Browsing…"}
            </div>
          )}
        </div>

        <div className="chat-area">
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}

          {/* Suggestions on empty chat */}
          {messages.length === 1 && (
            <div className="suggestions-wrap">
              <p className="suggestions-label">Try asking:</p>
              <div className="suggestions-grid">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── INPUT ── */}
        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={inputRef}
              className="input-field"
              placeholder="Ask WebPilot to research flights, hotels, products…"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? "…" : "↑"}
            </button>
          </div>
          <p className="input-hint">Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      {/* ── STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080f1a;
          --surface: #0d1829;
          --surface2: #111e30;
          --border: rgba(255,255,255,0.07);
          --accent: #3b82f6;
          --accent2: #6366f1;
          --green: #10b981;
          --muted: #64748b;
          --text: #e2e8f0;
          --font: 'DM Sans', system-ui, sans-serif;
          --mono: 'DM Mono', monospace;
        }

        html, body, #root { height: 100%; font-family: var(--font); background: var(--bg); color: var(--text); }

        .app {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 16px;
          gap: 20px;
        }

        .sidebar-top { display: flex; flex-direction: column; gap: 20px; }

        .logo { display: flex; align-items: center; gap: 12px; padding: 0 4px; }

        .logo-mark {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }

        .logo-name { font-size: 17px; font-weight: 700; }
        .logo-sub  { font-size: 11px; color: var(--muted); margin-top: 1px; }

        .new-chat-btn {
          width: 100%;
          padding: 12px;
          border: 1px dashed rgba(59,130,246,0.4);
          border-radius: 12px;
          background: rgba(59,130,246,0.06);
          color: var(--accent);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
        }
        .new-chat-btn:hover {
          background: rgba(59,130,246,0.14);
          border-color: var(--accent);
        }

        .sidebar-nav { display: flex; flex-direction: column; gap: 6px; }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          border: none; background: transparent; color: var(--muted);
          font-size: 14px; font-weight: 500; cursor: pointer;
          text-align: left; transition: 0.2s; font-family: var(--font);
        }
        .nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
        .nav-item.active {
          background: rgba(59,130,246,0.12); color: var(--text);
          border: 1px solid rgba(59,130,246,0.25);
        }
        .nav-icon { font-size: 16px; }

        .sidebar-bottom { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }

        .history-list {
          display: flex; flex-direction: column; gap: 8px;
          max-height: 400px; overflow-y: auto;
        }

        .history-item {
          width: 100%; padding: 12px; border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid transparent;
          color: var(--text); font-size: 13px;
          text-align: left; cursor: pointer; transition: 0.2s;
          font-family: var(--font);
        }
        .history-item:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.06); }
        .selected-history { border-color: rgba(59,130,246,0.4) !important; background: rgba(59,130,246,0.1) !important; }
        .history-title { font-size: 13px; line-height: 1.5; }
        .history-date  { font-size: 11px; color: var(--muted); margin-top: 4px; }
        .empty-history { color: var(--muted); text-align: center; font-size: 13px; margin-top: 16px; }

        .sidebar-status {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(16,185,129,0.07);
          color: var(--green); font-size: 13px;
        }
        .status-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 8px var(--green);
          flex-shrink: 0;
        }
        .status-dot.pulse { animation: pulseGlow 1.2s infinite; }

        /* ── MAIN ── */
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .topbar {
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          background: rgba(8,15,26,0.8);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: space-between;
        }

        .topbar-info h1 { font-size: 22px; font-weight: 700; }
        .topbar-badge {
          font-size: 11px; padding: 2px 8px; border-radius: 6px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          vertical-align: middle; margin-left: 8px;
        }
        .topbar-info p { color: var(--muted); font-size: 13px; margin-top: 4px; }

        .status-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; border-radius: 20px;
          background: rgba(59,130,246,0.1); color: var(--accent);
          font-size: 13px; border: 1px solid rgba(59,130,246,0.25);
        }

        .chat-area {
          flex: 1; overflow-y: auto; padding: 28px 32px;
          display: flex; flex-direction: column; gap: 20px;
        }

        /* ── MESSAGES ── */
        .message-row {
          display: flex; gap: 12px; animation: fadeUp 0.3s ease;
        }
        .message-row.user { justify-content: flex-end; }

        .avatar {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; align-self: flex-start;
          margin-top: 4px;
        }
        .agent-avatar { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
        .user-avatar  { background: #1e2d44; color: var(--muted); }

        .bubble {
          max-width: 76%; padding: 18px 20px; border-radius: 18px;
          line-height: 1.75;
        }
        .agent-bubble {
          background: var(--surface2);
          border: 1px solid var(--border);
        }
        .user-bubble {
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          font-size: 15px;
        }

        /* ── INTENT BADGE ── */
        .intent-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 12px; border-radius: 20px; border: 1px solid;
          margin-bottom: 12px; font-size: 12px;
        }
        .intent-icon { font-size: 14px; }
        .intent-label { font-weight: 600; }
        .intent-details { color: var(--muted); }

        /* ── SOURCES ── */
        .sources-section { margin-bottom: 14px; }
        .sources-label {
          font-size: 12px; color: var(--muted); margin-bottom: 8px;
        }
        .sources-row {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .source-card {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          background: rgba(59,130,246,0.08);
          border: 1px solid rgba(59,130,246,0.2);
          color: #93c5fd; font-size: 12px; font-weight: 500;
          text-decoration: none;
          animation: fadeUp 0.3s forwards; opacity: 0;
          transition: 0.2s;
        }
        .source-card:hover {
          background: rgba(59,130,246,0.18);
          border-color: rgba(59,130,246,0.4);
        }
        .source-check { color: var(--green); margin-left: auto; }

        /* ── FORMATTED RESULT ── */
        .summary-section { margin-top: 4px; }

        .formatted-result { display: flex; flex-direction: column; gap: 4px; }

        .res-h3 { font-size: 14px; font-weight: 700; color: #93c5fd; margin: 10px 0 4px; }
        .res-bold { font-weight: 600; }
        .res-bullet { padding-left: 14px; color: var(--text); font-size: 14px; }
        .res-winner {
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
          border-radius: 10px; padding: 10px 14px;
          color: var(--green); font-weight: 600; margin: 8px 0;
        }
        .res-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
        .res-spacer  { height: 4px; }
        .res-line    { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }

        /* ── TYPING ── */
        .typing-wrap { display: flex; align-items: center; gap: 10px; }
        .typing-label { color: var(--muted); font-size: 13px; }
        .typing-dots { display: flex; gap: 5px; }
        .typing-dots span {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent); animation: blink 1.2s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        /* ── SUGGESTIONS ── */
        .suggestions-wrap { margin-top: 12px; }
        .suggestions-label { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
        .suggestions-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .suggestion-chip {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 14px; padding: 14px 16px;
          color: var(--text); cursor: pointer; text-align: left;
          font-size: 13px; line-height: 1.6; transition: 0.2s;
          font-family: var(--font);
        }
        .suggestion-chip:hover {
          transform: translateY(-2px);
          background: rgba(59,130,246,0.08);
          border-color: rgba(59,130,246,0.35);
        }

        /* ── INPUT ── */
        .input-area {
          padding: 20px 32px;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .input-box {
          display: flex; align-items: flex-end; gap: 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 12px 14px;
          transition: border-color 0.2s;
        }
        .input-box:focus-within { border-color: rgba(59,130,246,0.5); }
        .input-field {
          flex: 1; background: none; border: none; outline: none;
          resize: none; color: var(--text); font-size: 14px;
          max-height: 150px; font-family: var(--font); line-height: 1.6;
        }
        .input-field::placeholder { color: var(--muted); }
        .input-field:disabled { opacity: 0.6; }

        .send-btn {
          width: 44px; height: 44px; border: none; border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: white; cursor: pointer; font-size: 18px; font-weight: 700;
          flex-shrink: 0; transition: 0.2s; display: flex;
          align-items: center; justify-content: center;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); opacity: 0.9; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .input-hint {
          text-align: center; color: var(--muted); font-size: 11px;
          margin-top: 10px;
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #1e2d44; border-radius: 20px; }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 0.3; } 50% { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 4px var(--green); opacity: 1; }
          50%      { box-shadow: 0 0 14px var(--green); opacity: 0.6; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .sidebar { display: none; }
          .suggestions-grid { grid-template-columns: 1fr; }
          .bubble { max-width: 92%; }
          .topbar { padding: 16px 20px; }
          .chat-area { padding: 20px; }
          .input-area { padding: 14px 20px; }
        }
      `}</style>
    </div>
  );
}