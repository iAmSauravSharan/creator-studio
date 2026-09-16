"use client";
import { useEffect, useState } from "react";

type GlobalSettings = {
  batchProductionDays: string; discoveryFrequencyDays: number; defaultStylePromptVersion: string;
  thumbnailMode: string; defaultThumbnailTemplate: string; thumbnailAspectRatio: string;
  brandColorScheme: string; brandArtStyle: string; brandFontFamily: string; nicheDescription: string;
  youtubeDefaultTags: string; playbookLocation: string;
  enableKitsAiPolish: boolean; enableBeeminder: boolean; beeminderGoalRate: number;
};
type Account = {
  id: string; platform: string; label: string; weeklyUploadTarget: number; tokenEnvKey?: string | null;
  youtubeChannelId?: string; youtubeCategoryId?: string; redditDefaultSubreddit?: string;
};

const PLATFORM_LABELS: Record<string, string> = { youtube: "▶️ YouTube", reddit: "👽 Reddit", x: "✖️ X / Twitter", instagram: "📸 Instagram" };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label>{label}{hint && <span className="hint"> — {hint}</span>}</label>{children}</div>;
}

function AccountCard({ account, onChange, onSave }: { account: Account; onChange: (a: Account) => void; onSave: () => void }) {
  const connectUrl = account.platform === "youtube" ? `/api/youtube/authorize?accountId=${account.id}` : account.platform === "reddit" ? `/api/reddit/authorize?accountId=${account.id}` : null;
  return (
    <div className="card">
      <div className="card-group-title"><h3>{PLATFORM_LABELS[account.platform]} — {account.label}</h3></div>
      <Field label="Nickname"><input value={account.label} onChange={(e) => onChange({ ...account, label: e.target.value })} /></Field>
      <Field label="Weekly upload target"><input type="number" value={account.weeklyUploadTarget} onChange={(e) => onChange({ ...account, weeklyUploadTarget: Number(e.target.value) })} /></Field>
      {account.platform === "youtube" && (
        <>
          <Field label="Channel ID"><input value={account.youtubeChannelId ?? ""} onChange={(e) => onChange({ ...account, youtubeChannelId: e.target.value })} /></Field>
          <Field label="Category ID"><input value={account.youtubeCategoryId ?? ""} onChange={(e) => onChange({ ...account, youtubeCategoryId: e.target.value })} /></Field>
        </>
      )}
      {account.platform === "reddit" && (
        <Field label="Default subreddit" hint="Without r/"><input value={account.redditDefaultSubreddit ?? ""} onChange={(e) => onChange({ ...account, redditDefaultSubreddit: e.target.value })} /></Field>
      )}
      <div style={{ marginTop: 16, padding: 14, background: "rgba(244,163,64,0.06)", borderRadius: 10 }}>
        {account.tokenEnvKey ? (
          <div style={{ fontSize: 13, color: "var(--success)" }}>✓ Connected — reading token from <code>{account.tokenEnvKey}</code></div>
        ) : connectUrl ? (
          <a href={connectUrl}><button className="secondary" type="button">🔗 Connect {PLATFORM_LABELS[account.platform]}</button></a>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Direct connection not available yet for this platform — use the Claude in Chrome handoff.</div>
        )}
      </div>
      <button className="secondary" style={{ marginTop: 14 }} onClick={onSave}>Save</button>
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<GlobalSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saved, setSaved] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: "youtube", label: "" });

  function loadAccounts() { fetch("/api/accounts").then((r) => r.json()).then(setAccounts); }
  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then(setS); loadAccounts(); }, []);

  async function saveGlobal() {
    if (!s) return;
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function saveAccount(a: Account) {
    await fetch(`/api/accounts/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    loadAccounts();
  }

  async function addAccount() {
    if (!newAccount.label.trim()) return;
    await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newAccount) });
    setNewAccount({ platform: "youtube", label: "" });
    loadAccounts();
  }

  if (!s) return <div className="card">Loading…</div>;
  const set = (k: keyof GlobalSettings, v: any) => setS({ ...s, [k]: v });

  return (
    <div>
      <div className="hero"><div className="hero-emoji">⚙️</div><h1>Settings</h1><div className="hero-sub">Accounts and global preferences, grouped so it's never overwhelming.</div></div>

      <div className="card-group-title" style={{ marginBottom: 8 }}><h3>🔌 Accounts</h3></div>
      {accounts.map((a) => (
        <AccountCard key={a.id} account={a} onChange={(updated) => setAccounts(accounts.map((x) => x.id === updated.id ? updated : x))} onSave={() => saveAccount(accounts.find((x) => x.id === a.id)!)} />
      ))}
      <div className="card">
        <h3>+ Add account</h3>
        <label>Platform</label>
        <select value={newAccount.platform} onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value })}>
          {Object.entries(PLATFORM_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label>Nickname</label>
        <input value={newAccount.label} onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })} placeholder="e.g. Sirf Bhakti Songs — Main" />
        <div style={{ marginTop: 14 }}><button onClick={addAccount} disabled={!newAccount.label.trim()}>Add account</button></div>
      </div>

      <div className="card">
        <div className="card-group-title"><h3>🎨 Branding &amp; Thumbnails</h3></div>
        <Field label="Thumbnail mode">
          <select value={s.thumbnailMode} onChange={(e) => set("thumbnailMode", e.target.value)}>
            <option value="ai">AI-generated background + text overlay</option>
            <option value="template">Local licensed template image</option>
          </select>
        </Field>
        <Field label="Aspect ratio"><input value={s.thumbnailAspectRatio} onChange={(e) => set("thumbnailAspectRatio", e.target.value)} /></Field>
        <Field label="Color scheme"><input value={s.brandColorScheme} onChange={(e) => set("brandColorScheme", e.target.value)} /></Field>
        <Field label="Art style"><input value={s.brandArtStyle} onChange={(e) => set("brandArtStyle", e.target.value)} /></Field>
        <Field label="Thumbnail text font"><input value={s.brandFontFamily} onChange={(e) => set("brandFontFamily", e.target.value)} /></Field>
        <Field label="Template background file"><input value={s.defaultThumbnailTemplate} onChange={(e) => set("defaultThumbnailTemplate", e.target.value)} /></Field>
      </div>

      <div className="card">
        <div className="card-group-title"><h3>📅 Schedule &amp; Pace</h3></div>
        <Field label="Batch production days" hint="Comma-separated"><input value={s.batchProductionDays} onChange={(e) => set("batchProductionDays", e.target.value)} /></Field>
        <Field label="Trend discovery frequency (days)"><input type="number" value={s.discoveryFrequencyDays} onChange={(e) => set("discoveryFrequencyDays", Number(e.target.value))} /></Field>
      </div>

      <div className="card">
        <div className="card-group-title"><h3>🧭 Niche &amp; Research</h3></div>
        <Field label="Niche description"><input value={s.nicheDescription} onChange={(e) => set("nicheDescription", e.target.value)} /></Field>
        <Field label="Fallback YouTube tags"><input value={s.youtubeDefaultTags} onChange={(e) => set("youtubeDefaultTags", e.target.value)} /></Field>
        <Field label="Default style prompt version"><input value={s.defaultStylePromptVersion} onChange={(e) => set("defaultStylePromptVersion", e.target.value)} /></Field>
        <Field label="Playbook location"><input value={s.playbookLocation} onChange={(e) => set("playbookLocation", e.target.value)} /></Field>
      </div>

      <div className="card">
        <div className="card-group-title"><h3>🧩 Optional Integrations</h3></div>
        <div className="toggle-row">
          <input type="checkbox" checked={s.enableKitsAiPolish} onChange={(e) => set("enableKitsAiPolish", e.target.checked)} />
          <div className="toggle-meta"><div>Kits.ai voice polish</div><div className="hint">Only turn on once KITS_AI_API_KEY is set in .env</div></div>
        </div>
        <div className="toggle-row">
          <input type="checkbox" checked={s.enableBeeminder} onChange={(e) => set("enableBeeminder", e.target.checked)} />
          <div className="toggle-meta"><div>Beeminder accountability</div><div className="hint">Only turn on once your Beeminder goal + .env keys are set up</div></div>
        </div>
        {s.enableBeeminder && <Field label="Beeminder weekly goal rate"><input type="number" value={s.beeminderGoalRate} onChange={(e) => set("beeminderGoalRate", Number(e.target.value))} /></Field>}
      </div>

      <button onClick={saveGlobal}>{saved ? "Saved ✓" : "Save global settings"}</button>
    </div>
  );
}
