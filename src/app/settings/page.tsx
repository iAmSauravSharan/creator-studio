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

const PLATFORM_ICONS: Record<string, string> = { youtube: "▶", reddit: "◈", x: "✕", instagram: "◎" };
const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", reddit: "Reddit", x: "X", instagram: "Instagram" };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle-switch" role="switch" onClick={() => onChange(!checked)} style={{ background: checked ? "linear-gradient(120deg, var(--accent), var(--accent-2))" : "#2a2420" }}>
      <span className="toggle-knob" style={{ marginLeft: checked ? 20 : 0 }} />
    </button>
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
  function connectUrl(a: Account) {
    if (a.platform === "youtube") return `/api/youtube/authorize?accountId=${a.id}`;
    if (a.platform === "reddit") return `/api/reddit/authorize?accountId=${a.id}`;
    return null;
  }

  if (!s) return <div className="page"><div className="card">Loading…</div></div>;
  const set = (k: keyof GlobalSettings, v: any) => setS({ ...s, [k]: v });

  return (
    <div className="page page-mid">
      <div className="kicker">Settings</div>
      <h1>Automation setup</h1>
      <div style={{ height: 20 }} />

      <div className="card-plain">
        <h3>Accounts</h3>
        <p className="sub" style={{ marginBottom: 16 }}>One card per destination. Disconnecting keeps drafts.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {accounts.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, background: "var(--card-alt)", border: "1px solid rgba(255,255,255,.07)" }}>
              <span style={{ width: 32, height: 32, borderRadius: 11, background: "var(--accent-soft)", border: "1px solid rgba(244,163,64,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flex: "none" }}>{PLATFORM_ICONS[a.platform]}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
                <div className="hint">{a.tokenEnvKey ? `Connected · ${PLATFORM_LABELS[a.platform]}` : "Not connected"}</div>
              </div>
              {a.tokenEnvKey ? (
                <button className="btn-secondary" style={{ marginLeft: "auto", flex: "none", minHeight: 32, padding: "7px 12px", fontSize: 12 }}>Manage</button>
              ) : connectUrl(a) ? (
                <a href={connectUrl(a)!} style={{ marginLeft: "auto" }}><button className="btn-primary" style={{ minHeight: 32, padding: "7px 14px", fontSize: 12 }}>Connect</button></a>
              ) : (
                <span className="hint" style={{ marginLeft: "auto" }}>Not available yet</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px" }}>
              <label>Platform</label>
              <select value={newAccount.platform} onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value })}>
                {Object.entries(PLATFORM_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: "2 1 240px" }}>
              <label>Nickname</label>
              <input value={newAccount.label} onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })} placeholder="e.g. Sirf Bhakti Songs — Main" />
            </div>
            <button className="btn-primary" onClick={addAccount} disabled={!newAccount.label.trim()}>+ Add account</button>
          </div>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="card-plain">
          <h3>Weekly targets by account</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Weekly targets drive the dashboard bars.</p>
          <div style={{ display: "grid", gap: 12 }}>
            {accounts.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{PLATFORM_ICONS[a.platform]} {a.label}</span>
                <input type="number" value={a.weeklyUploadTarget}
                  onChange={(e) => setAccounts(accounts.map((x) => x.id === a.id ? { ...x, weeklyUploadTarget: Number(e.target.value) } : x))}
                  onBlur={() => saveAccount(accounts.find((x) => x.id === a.id)!)}
                  style={{ marginLeft: "auto", flex: "none", width: 72, height: 38, fontWeight: 700, textAlign: "center" }} />
                <span className="hint" style={{ flex: "none" }}>/ week</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        <div className="card-plain">
          <h3>Branding &amp; thumbnails</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Defaults applied to every generated image.</p>
          <label>Thumbnail mode</label>
          <select value={s.thumbnailMode} onChange={(e) => set("thumbnailMode", e.target.value)}>
            <option value="ai">AI-generated background + text overlay</option>
            <option value="template">Local licensed template image</option>
          </select>
          <label style={{ marginTop: 14 }}>Title font</label>
          <input value={s.brandFontFamily} onChange={(e) => set("brandFontFamily", e.target.value)} />
          <label style={{ marginTop: 14 }}>Color scheme</label>
          <input value={s.brandColorScheme} onChange={(e) => set("brandColorScheme", e.target.value)} />
          <label style={{ marginTop: 14 }}>Art style</label>
          <input value={s.brandArtStyle} onChange={(e) => set("brandArtStyle", e.target.value)} />
          <label style={{ marginTop: 14 }}>Aspect ratio</label>
          <input value={s.thumbnailAspectRatio} onChange={(e) => set("thumbnailAspectRatio", e.target.value)} />
          <a href="/settings/thumbnail-templates" style={{ display: "inline-block", marginTop: 14, fontSize: 13 }}>Manage thumbnail templates →</a>
        </div>

        <div className="card-plain">
          <h3>Niche &amp; research</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Guides AI suggestions and keyword research.</p>
          <label>Primary niche</label>
          <input value={s.nicheDescription} onChange={(e) => set("nicheDescription", e.target.value)} />
          <label style={{ marginTop: 14 }}>Fallback YouTube tags</label>
          <input value={s.youtubeDefaultTags} onChange={(e) => set("youtubeDefaultTags", e.target.value)} />
          <label style={{ marginTop: 14 }}>Default style prompt version</label>
          <input value={s.defaultStylePromptVersion} onChange={(e) => set("defaultStylePromptVersion", e.target.value)} />
          <label style={{ marginTop: 14 }}>Playbook location</label>
          <input value={s.playbookLocation} onChange={(e) => set("playbookLocation", e.target.value)} />
        </div>

        <div className="card-plain">
          <h3>Schedule &amp; pace</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Batch days and research cadence.</p>
          <label>Batch production days</label>
          <input value={s.batchProductionDays} onChange={(e) => set("batchProductionDays", e.target.value)} />
          <label style={{ marginTop: 14 }}>Trend discovery frequency (days)</label>
          <input type="number" value={s.discoveryFrequencyDays} onChange={(e) => set("discoveryFrequencyDays", Number(e.target.value))} />
        </div>

        <div className="card-plain">
          <h3>Optional integrations</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Off by default — enable only what you use.</p>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Kits.ai voice polish</div>
                <div className="hint">Requires KITS_AI_API_KEY in .env</div>
              </div>
              <div style={{ marginLeft: "auto" }}><Toggle checked={s.enableKitsAiPolish} onChange={(v) => set("enableKitsAiPolish", v)} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Beeminder accountability</div>
                <div className="hint">Requires Beeminder goal + .env keys</div>
              </div>
              <div style={{ marginLeft: "auto" }}><Toggle checked={s.enableBeeminder} onChange={(v) => set("enableBeeminder", v)} /></div>
            </div>
            {s.enableBeeminder && (
              <div>
                <label>Beeminder weekly goal rate</label>
                <input type="number" value={s.beeminderGoalRate} onChange={(e) => set("beeminderGoalRate", Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={saveGlobal} style={{ marginTop: 4 }}>{saved ? "Saved ✓" : "Save global settings"}</button>
    </div>
  );
}
