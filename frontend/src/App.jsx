import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

// Known clean documents — anything retrieved outside this list is flagged as poisoned/unexpected
const KNOWN_CLEAN_DOCS = [
  "company_faq.txt",
  "product_info.txt",
  "refund_policy.txt",
  "shipping_info.txt",
];

function App() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [retrievedDocs, setRetrievedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [poisoned, setPoisoned] = useState(false);
  const [poisoning, setPoisoning] = useState(false);

  async function togglePoison() {
    setPoisoning(true);
    try {
      const method = poisoned ? "DELETE" : "POST";
      await fetch(`${API_URL}/poison`, { method });
      setPoisoned(!poisoned);
    } catch (err) {
      alert("Could not reach backend to toggle poisoned doc.");
    } finally {
      setPoisoning(false);
    }
  }

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  async function sendMessage() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");
    setRetrievedDocs([]);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResponse(data.response);
      setRetrievedDocs(data.retrieved_docs || []);
    } catch (err) {
      setResponse("Error: could not reach the backend. Is uvicorn running?");
    } finally {
      setLoading(false);
    }
  }

  const hasPoisonedDoc = retrievedDocs.some(
    (doc) => !KNOWN_CLEAN_DOCS.includes(doc)
  );

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "48px auto",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: "0 16px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
          RAG Chatbot
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
          Target App — Prompt Injection Defense Testbed
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button
          onClick={togglePoison}
          disabled={poisoning}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: `1px solid ${poisoned ? "#b91c1c" : "#ccc"}`,
            background: poisoned ? "#fef2f2" : "#fff",
            color: poisoned ? "#b91c1c" : "#555",
            cursor: poisoning ? "default" : "pointer",
          }}
        >
          {poisoning
            ? "Updating..."
            : poisoned
            ? "🧪 Poisoned doc ACTIVE — click to remove"
            : "🧪 Inject poisoned doc for testing"}
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          padding: 20,
        }}
      >
        <textarea
          rows={3}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #ddd",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            marginTop: 12,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: loading ? "#aaa" : "#2563eb",
            color: "#fff",
            cursor: loading ? "default" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? `Thinking... (${elapsed}s)` : "Send"}
        </button>

        {retrievedDocs.length > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 8,
              background: hasPoisonedDoc ? "#fef2f2" : "#eff6ff",
              border: `1px solid ${hasPoisonedDoc ? "#fecaca" : "#bfdbfe"}`,
            }}
          >
            <strong
              style={{
                fontSize: 13,
                color: hasPoisonedDoc ? "#b91c1c" : "#1d4ed8",
              }}
            >
              {hasPoisonedDoc
                ? "⚠ Retrieved documents (includes untrusted/poisoned content):"
                : "Retrieved documents:"}
            </strong>
            <ul style={{ margin: "8px 0 0 18px", fontSize: 13 }}>
              {retrievedDocs.map((doc, i) => {
                const isPoisoned = !KNOWN_CLEAN_DOCS.includes(doc);
                return (
                  <li
                    key={i}
                    style={{
                      color: isPoisoned ? "#b91c1c" : "#374151",
                      fontWeight: isPoisoned ? 600 : 400,
                    }}
                  >
                    {doc} {isPoisoned && "(unrecognized source)"}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            padding: 14,
            minHeight: 60,
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #eee",
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {response || (
            <span style={{ color: "#aaa" }}>Response will appear here...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;