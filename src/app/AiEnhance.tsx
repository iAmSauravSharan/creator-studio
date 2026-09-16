"use client";
import { useState } from "react";
import { diffWords } from "diff";

export default function AiEnhance({
  field,
  currentText,
  context,
  onAccept,
}: {
  field: "title" | "description" | "lyrics" | "style";
  currentText: string;
  context?: { deity?: string; occasion?: string; platform?: string };
  onAccept: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ rewritten: string; chips: string[] } | null>(null);
  const [error, setError] = useState("");

  async function enhance() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/ai/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, currentText, context }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Enhance failed");
    else setResult(data);
    setLoading(false);
  }

  function accept() {
    if (result) onAccept(result.rewritten);
    setResult(null);
  }

  const parts = result ? diffWords(currentText, result.rewritten) : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-enhance" onClick={enhance} disabled={loading || !currentText.trim()}>
          {loading ? "Thinking…" : "✨ Enhance with AI"}
        </button>
      </div>

      {error && <div className="hint" style={{ color: "#ff8080", marginTop: 8 }}>{error}</div>}

      {result && (
        <div className="suggestion-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="suggestion-tag">✨ Suggested rewrite</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            {parts.map((part, i) => (
              <span key={i} className={part.removed ? "suggestion-old" : part.added ? "suggestion-new" : undefined}>
                {part.value}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-primary" onClick={accept}>Accept</button>
            <button className="btn-secondary" onClick={() => setResult(null)}>Dismiss</button>
          </div>

          {result.chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
              <span className="hint" style={{ marginRight: 2 }}>Also consider</span>
              {result.chips.map((chip, i) => (
                <span key={i} className="chip" style={{ cursor: "default" }}>{chip}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
