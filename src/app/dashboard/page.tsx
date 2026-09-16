"use client";
import { useEffect, useState } from "react";

const PLATFORM_ICONS: Record<string, string> = { youtube: "▶", reddit: "◈", x: "✕", instagram: "◎" };
const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", reddit: "Reddit", x: "X", instagram: "Instagram" };

function weekCount(posts: any[], accountId: string) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return posts.filter((p) => p.accountId === accountId && ["SCHEDULED", "PUBLISHED"].includes(p.status) && new Date(p.updatedAt) >= monday).length;
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/posts").then((r) => r.json()).then(setPosts);
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  return (
    <div className="page">
      <div className="kicker">This week</div>
      <h1>Pace by account</h1>
      <p className="sub">{accounts.length} connected account{accounts.length === 1 ? "" : "s"}, each on its own weekly target.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {accounts.map((a) => {
          const count = weekCount(posts, a.id);
          const pct = Math.min(100, (count / a.weeklyUploadTarget) * 100);
          return (
            <div className="card-plain" key={a.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--accent-soft)", border: "1px solid rgba(244,163,64,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flex: "none" }}>{PLATFORM_ICONS[a.platform]}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
                  <div className="hint">{PLATFORM_LABELS[a.platform]}</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{count}</span>
                <span style={{ fontSize: 13, color: "var(--text-dim)" }}>of {a.weeklyUploadTarget} this week</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "38px 0 14px" }}>
        <h2 style={{ fontSize: 20 }}>All posts</h2>
        <span className="hint">{posts.length} posts · {accounts.length} accounts</span>
      </div>
      <div className="card-plain" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>Title</th><th>Account</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {posts.map((p) => {
              const acc = accounts.find((a) => a.id === p.accountId);
              const isLive = p.status === "PUBLISHED" || p.status === "SCHEDULED";
              return (
                <tr key={p.id}>
                  <td><a href={`/posts/${p.id}`}>{PLATFORM_ICONS[p.platform]} {p.title}</a></td>
                  <td style={{ color: "var(--text-dim)" }}>{acc?.label ?? p.platform}</td>
                  <td><span className={`badge ${isLive ? p.status : "wip"}`}>{p.status === "DRAFT" ? "Draft" : p.status}</span></td>
                  <td style={{ color: "var(--text-faint)" }}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {posts.length === 0 && <tr><td colSpan={4} style={{ color: "var(--text-faint)" }}>Nothing yet — click "+ New Post" above to start.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
