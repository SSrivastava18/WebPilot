import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Find the cheapest flight from Delhi to Mumbai for tomorrow",
  "Find hotels in Goa under ₹3000 with good ratings",
  "Compare iPhone 15 prices across Flipkart and Amazon",
  "Search for top 5 restaurants in Connaught Place",
];

function TypingDots() {
  return (
    <span className="typing-dots">
      <span />
      <span />
      <span />
    </span>
  );
}

function AgentStep({ step, index }) {
  return (
    <div
      className="agent-step"
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <span className="step-icon">⚡</span>

      <span className="step-text">
        {step.tool || "Processing"}
      </span>

      <span className="step-check">✓</span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`message-row ${
        isUser ? "user" : "agent"
      }`}
    >
      {!isUser && (
        <div className="avatar agent-avatar">
          AI
        </div>
      )}

      <div
        className={`bubble ${
          isUser
            ? "user-bubble"
            : "agent-bubble"
        }`}
      >
        {msg.steps &&
          msg.steps.length > 0 && (
            <div className="steps-container">
              {msg.steps.map((step, i) => (
                <AgentStep
                  key={i}
                  step={step}
                  index={i}
                />
              ))}
            </div>
          )}

        {msg.typing ? (
          <TypingDots />
        ) : (
          <p className="bubble-text">
            {msg.content}
          </p>
        )}

        {msg.result && (
          <div className="result-card">
            <div className="result-header">
              Agent Execution
            </div>

            <pre className="result-pre">
              {msg.result}
            </pre>
          </div>
        )}
      </div>

      {isUser && (
        <div className="avatar user-avatar">
          U
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "nexus-current-chat"
        );

      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 1,
              role: "agent",
              content:
                "Welcome to Nexus AI.\n\nI can browse websites, compare products, search the web, find hotels, restaurants, flights and automate browser workflows.",
            },
          ];
    });

  const [history, setHistory] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "nexus-history"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    });

  const [activeTab, setActiveTab] =
    useState("chat");

  const [selectedChatId, setSelectedChatId] =
    useState(null);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const bottomRef = useRef(null);

  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      "nexus-current-chat",
      JSON.stringify(messages)
    );
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      "nexus-history",
      JSON.stringify(history)
    );
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const saveConversationToHistory = (
    updatedMessages,
    query
  ) => {
    const historyItem = {
      id: Date.now(),

      title:
        query.length > 45
          ? query.slice(0, 45) + "..."
          : query,

      date: new Date().toLocaleString(),

      messages: updatedMessages,
    };

    setHistory((prev) => [
      historyItem,
      ...prev,
    ]);
  };

  const openHistoryChat = (chat) => {
    setMessages(chat.messages);

    setSelectedChatId(chat.id);

    setActiveTab("chat");
  };

  const newChat = () => {
    const freshChat = [
      {
        id: Date.now(),
        role: "agent",
        content:
          "New chat started.\n\nAsk me anything related to browsing, searching or automation.",
      },
    ];

    setMessages(freshChat);

    setSelectedChatId(null);

    setActiveTab("chat");
  };

  const sendMessage = async (text) => {
    const query = text || input.trim();

    if (!query || loading) return;

    setInput("");

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: query,
    };

    const updatedMessages = [
      ...messages,
      userMsg,
    ];

    setMessages(updatedMessages);

    setLoading(true);

    const typingId = Date.now() + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: typingId,
        role: "agent",
        typing: true,
        content: "",
      },
    ]);

    try {
      const res = await fetch(
        "http://localhost:5000/api/agent",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            task: query,
          }),
        }
      );

      const data = await res.json();

      const formattedResult =
        data.steps &&
        data.steps.length > 0
          ? data.steps
              .map(
                (s, i) => `
STEP ${i + 1}

TOOL:
${s.website || s.tool}

OUTPUT:
${
  typeof s.data === "object"
    ? JSON.stringify(
        s.data,
        null,
        2
      )
    : s.output
}
`
              )
              .join(
                "\n────────────────────────────\n"
              )
          : "No execution steps returned.";

      const finalMessages =
        messages.concat([
          userMsg,
          {
            id: typingId,

            role: "agent",

            typing: false,

            steps:
              data.steps?.map((s) => ({
                tool:
                  s.website || s.tool,
              })) || [],

            content:
              data.summary ||
              "Task completed.",

            result: formattedResult,
          },
        ]);

      setMessages(finalMessages);

      saveConversationToHistory(
        finalMessages,
        query
      );
    } catch (err) {
      console.error(err);

      const finalMessages =
        messages.concat([
          userMsg,
          {
            id: typingId,

            role: "agent",

            content:
              "Could not connect to backend server.",

            result:
              "Make sure backend is running on port 5000.",
          },
        ]);

      setMessages(finalMessages);
    }

    setLoading(false);

    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage();
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="logo-icon">
              ⚡
            </div>

            <div>
              <h2>Nexus AI</h2>

              <p>
                Autonomous Browser
              </p>
            </div>
          </div>

          <button
            className="new-chat-btn"
            onClick={newChat}
          >
            + New Chat
          </button>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${
                activeTab === "chat"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveTab("chat")
              }
            >
              💬 Chat
            </button>

            <button
              className={`nav-item ${
                activeTab === "history"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveTab("history")
              }
            >
              🕘 History
            </button>
          </nav>

          {activeTab === "history" && (
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-history">
                  No chat history
                </p>
              ) : (
                history.map((chat) => (
                  <div
                    key={chat.id}
                    className={`history-item ${
                      selectedChatId ===
                      chat.id
                        ? "selected-history"
                        : ""
                    }`}
                    onClick={() =>
                      openHistoryChat(chat)
                    }
                  >
                    <div className="history-title">
                      {chat.title}
                    </div>

                    <div className="history-date">
                      {chat.date}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="sidebar-status">
          <div className="status-dot" />

          <span>Agent Online</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-info">
            <h1>Nexus AI Agent</h1>

            <p>
              Smart browser automation
              with intelligent web
              navigation
            </p>
          </div>
        </header>

        <div className="chat-area">
          {messages.length === 1 && (
            <div className="suggestions">
              <p className="suggestions-label">
                Suggested Tasks
              </p>

              <div className="suggestions-grid">
                {SUGGESTIONS.map(
                  (s, i) => (
                    <button
                      key={i}
                      className="suggestion-chip"
                      onClick={() =>
                        sendMessage(s)
                      }
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Message
              key={msg.id}
              msg={msg}
            />
          ))}

          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={inputRef}
              className="input-field"
              rows={1}
              placeholder="Ask Nexus AI to search, compare or automate browser tasks..."
              value={input}
              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }
              onKeyDown={handleKey}
              disabled={loading}
            />

            <button
              className="send-btn"
              onClick={() =>
                sendMessage()
              }
              disabled={
                loading ||
                !input.trim()
              }
            >
              {loading
                ? "⏳"
                : "➜"}
            </button>
          </div>

          <p className="input-hint">
            Enter to send ·
            Shift+Enter for new
            line
          </p>
        </div>
      </main>

      <style>{`
        *{
          margin:0;
          padding:0;
          box-sizing:border-box;
        }

        :root{
          --bg:#07111f;
          --bg2:#101827;
          --bg3:#172235;
          --border:#22324b;
          --accent:#4f8cff;
          --accent2:#7c4dff;
          --text:#f8fbff;
          --muted:#8fa3bf;
          --green:#33d69f;
        }

        body{
          background:var(--bg);
          color:var(--text);
          font-family:Inter,sans-serif;
          overflow:hidden;
        }

        .app{
          display:flex;
          height:100vh;
          background:
          radial-gradient(circle at top left,#172235 0%,transparent 28%),
          radial-gradient(circle at bottom right,#14203a 0%,transparent 28%),
          var(--bg);
        }

        .sidebar{
          width:280px;
          background:rgba(16,24,39,0.92);
          border-right:1px solid var(--border);
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          padding:22px;
          backdrop-filter:blur(18px);
        }

        .sidebar-logo{
          display:flex;
          align-items:center;
          gap:14px;
          margin-bottom:24px;
        }

        .logo-icon{
          width:52px;
          height:52px;
          border-radius:16px;
          background:linear-gradient(135deg,var(--accent),var(--accent2));
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:22px;
          box-shadow:0 12px 30px rgba(79,140,255,0.35);
        }

        .sidebar-logo h2{
          font-size:20px;
          font-weight:700;
        }

        .sidebar-logo p{
          color:var(--muted);
          font-size:13px;
          margin-top:3px;
        }

        .new-chat-btn{
          width:100%;
          padding:14px;
          border:none;
          border-radius:14px;
          margin-bottom:18px;
          cursor:pointer;
          background:linear-gradient(135deg,var(--accent),var(--accent2));
          color:white;
          font-size:14px;
          font-weight:600;
        }

        .sidebar-nav{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .nav-item{
          border:none;
          background:transparent;
          color:var(--muted);
          padding:14px 16px;
          border-radius:14px;
          text-align:left;
          cursor:pointer;
          transition:0.25s;
          font-size:15px;
        }

        .nav-item:hover{
          background:rgba(255,255,255,0.05);
          color:white;
        }

        .nav-item.active{
          background:rgba(79,140,255,0.14);
          color:white;
          border:1px solid rgba(79,140,255,0.3);
        }

        .history-list{
          margin-top:18px;
          display:flex;
          flex-direction:column;
          gap:10px;
          max-height:420px;
          overflow-y:auto;
        }

        .history-item{
          padding:14px;
          border-radius:14px;
          background:rgba(255,255,255,0.03);
          border:1px solid transparent;
          cursor:pointer;
          transition:0.25s;
        }

        .history-item:hover{
          border-color:rgba(79,140,255,0.3);
          background:rgba(79,140,255,0.08);
        }

        .selected-history{
          border-color:rgba(79,140,255,0.4);
          background:rgba(79,140,255,0.1);
        }

        .history-title{
          font-size:14px;
          line-height:1.5;
        }

        .history-date{
          margin-top:8px;
          color:var(--muted);
          font-size:12px;
        }

        .empty-history{
          color:var(--muted);
          text-align:center;
          margin-top:20px;
          font-size:14px;
        }

        .sidebar-status{
          display:flex;
          align-items:center;
          gap:10px;
          padding:14px;
          border-radius:14px;
          background:rgba(51,214,159,0.08);
          color:var(--green);
          font-size:13px;
        }

        .status-dot{
          width:10px;
          height:10px;
          border-radius:50%;
          background:var(--green);
          box-shadow:0 0 12px var(--green);
        }

        .main{
          flex:1;
          display:flex;
          flex-direction:column;
        }

        .topbar{
          padding:28px 34px;
          border-bottom:1px solid var(--border);
          background:rgba(16,24,39,0.72);
          backdrop-filter:blur(12px);
        }

        .topbar-info h1{
          font-size:30px;
        }

        .topbar-info p{
          color:var(--muted);
          margin-top:8px;
        }

        .chat-area{
          flex:1;
          overflow-y:auto;
          padding:34px;
          display:flex;
          flex-direction:column;
          gap:24px;
        }

        .message-row{
          display:flex;
          gap:14px;
          animation:fadeUp 0.3s ease;
        }

        .message-row.user{
          justify-content:flex-end;
        }

        .avatar{
          width:42px;
          height:42px;
          border-radius:14px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:13px;
          font-weight:700;
        }

        .agent-avatar{
          background:linear-gradient(135deg,var(--accent),var(--accent2));
        }

        .user-avatar{
          background:#243552;
        }

        .bubble{
          max-width:78%;
          padding:20px;
          border-radius:22px;
          line-height:1.8;
        }

        .agent-bubble{
          background:rgba(16,24,39,0.9);
          border:1px solid var(--border);
        }

        .user-bubble{
          background:linear-gradient(135deg,#3763ff,#6d4dff);
        }

        .bubble-text{
          white-space:pre-wrap;
          font-size:15px;
        }

        .steps-container{
          margin-bottom:14px;
          padding-bottom:14px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .agent-step{
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:10px;
          color:var(--muted);
          font-size:13px;
          opacity:0;
          transform:translateY(10px);
          animation:fadeUp 0.3s forwards;
        }

        .step-check{
          margin-left:auto;
          color:#33d69f;
        }

        .result-card{
          margin-top:18px;
          border-radius:16px;
          overflow:hidden;
          border:1px solid rgba(79,140,255,0.25);
          background:#0e1727;
        }

        .result-header{
          padding:14px 18px;
          background:rgba(79,140,255,0.08);
          border-bottom:1px solid rgba(255,255,255,0.08);
          font-size:13px;
          color:#a9c3ff;
        }

        .result-pre{
          padding:18px;
          white-space:pre-wrap;
          overflow-x:auto;
          font-size:12px;
          line-height:1.7;
          color:#d7e3ff;
        }

        .typing-dots{
          display:flex;
          gap:6px;
        }

        .typing-dots span{
          width:8px;
          height:8px;
          border-radius:50%;
          background:var(--accent);
          animation:blink 1.2s infinite;
        }

        .typing-dots span:nth-child(2){
          animation-delay:0.2s;
        }

        .typing-dots span:nth-child(3){
          animation-delay:0.4s;
        }

        .input-area{
          padding:24px 30px;
          border-top:1px solid var(--border);
          background:rgba(16,24,39,0.92);
        }

        .input-box{
          display:flex;
          align-items:flex-end;
          gap:14px;
          background:rgba(255,255,255,0.03);
          border:1px solid var(--border);
          border-radius:20px;
          padding:14px 16px;
        }

        .input-field{
          flex:1;
          background:none;
          border:none;
          outline:none;
          resize:none;
          color:white;
          font-size:15px;
          max-height:160px;
        }

        .input-field::placeholder{
          color:var(--muted);
        }

        .send-btn{
          width:48px;
          height:48px;
          border:none;
          border-radius:14px;
          background:linear-gradient(135deg,var(--accent),var(--accent2));
          color:white;
          cursor:pointer;
          font-size:18px;
        }

        .send-btn:disabled{
          opacity:0.6;
          cursor:not-allowed;
        }

        .suggestions-label{
          margin-bottom:16px;
          color:var(--muted);
        }

        .suggestions-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .suggestion-chip{
          background:rgba(16,24,39,0.85);
          border:1px solid var(--border);
          border-radius:18px;
          padding:18px;
          color:white;
          cursor:pointer;
          text-align:left;
          transition:0.25s;
          line-height:1.6;
        }

        .suggestion-chip:hover{
          transform:translateY(-3px);
          background:rgba(79,140,255,0.08);
          border-color:rgba(79,140,255,0.4);
        }

        .input-hint{
          margin-top:12px;
          text-align:center;
          color:var(--muted);
          font-size:12px;
        }

        @keyframes blink{
          0%,100%{
            opacity:0.3;
          }
          50%{
            opacity:1;
          }
        }

        @keyframes fadeUp{
          from{
            opacity:0;
            transform:translateY(10px);
          }
          to{
            opacity:1;
            transform:translateY(0);
          }
        }

        ::-webkit-scrollbar{
          width:8px;
        }

        ::-webkit-scrollbar-thumb{
          background:#243552;
          border-radius:20px;
        }

        @media(max-width:900px){
          .sidebar{
            display:none;
          }

          .suggestions-grid{
            grid-template-columns:1fr;
          }

          .bubble{
            max-width:92%;
          }
        }
      `}</style>
    </div>
  );
}