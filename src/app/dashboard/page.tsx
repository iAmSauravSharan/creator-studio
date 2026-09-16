"use client";
import { useEffect, useState } from "react";

const PLATFORM_LABELS: Record<string, string> = { youtube: "▶️ YouTube", reddit: "👽 Reddit", x: "✖️ X / Twitter", instagram: "📸 Instagram" };
const ENCOURAGEMENTS = ["Every post is a step closer to your goal 🙏", "Consistency beats perfection — keep going!", "One more this week? You've got this."];

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

  const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

  return (
    <div>
      <div className="hero"><div className="hero-emoji">📊</div><h1>All Posts</h1></div>

      {accounts.map((a) => {
        const count = weekCount(posts, a.id);
        const pct = Math.min(100, (count / a.weeklyUploadTarget) * 100);
        return (
          <div className="card" key={a.id}>
            <h3>{PLATFORM_LABELS[a.platform]} — {a.label}</h3>
            <div className="progress-caption">{count} of {a.weeklyUploadTarget} this week</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
      {accounts.length > 0 && <div className="encourage">{msg}</div>}

      <div className="card">
        <h3>Pipeline</h3>
        <table>
          <thead><tr><th>Title</th><th>Account</th><th>Status</th><th>Scheduled</th></tr></thead>
          <tbody>
            {posts.map((p) => {
              const acc = accounts.find((a) => a.id === p.accountId);
              return (
                <tr key={p.id}>
                  <td><a href={`/posts/${p.id}`}>{p.title}</a></td>
                  <td>{acc ? `${PLATFORM_LABELS[acc.platform]} ${acc.label}` : p.platform}</td>
                  <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                  <td>{p.scheduledPublishAt ? new Date(p.scheduledPublishAt).toLocaleDateString() : "—"}</td>
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
