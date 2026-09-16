"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "./Stepper";
import AiEnhance from "./AiEnhance";

const THUMBNAIL_TEMPLATES = [
  { id: "temple-glow", name: "Temple Glow", description: "Warm temple silhouette with diyas." },
  { id: "iconographic-minimal", name: "Iconographic Minimal", description: "Clean, symbolic, calm." },
  { id: "nature-devotional", name: "Nature Devotional", description: "River ghat, mountain shrine." },
];
const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", reddit: "Reddit", x: "X", instagram: "Instagram" };
const PLATFORM_ICONS: Record<string, string> = { youtube: "▶", reddit: "◈", x: "✕", instagram: "◎" };
const STYLE_CHIPS = ["tanpura drone", "temple bells", "male baritone", "female vocals", "80 bpm", "reverb tail", "harmonium", "live aarti ambience"];
const SUBREDDIT_CHIPS = ["hinduism", "IndianClassicalMusic", "Sanskrit", "bhajan", "DevotionalMusic"];

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountId: "", title: "", deity: "", occasion: "", description: "", lyrics: "", stylePrompt: "",
    thumbnailPromptTemplateId: "temple-glow", thumbnailCustomIdea: "",
    redditSubreddit: "", redditFlair: "",
  });

  useEffect(() => { fetch("/api/accounts").then((r) => r.json()).then(setAccounts); }, []);

  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const platform = selectedAccount?.platform ?? "";
  const isReddit = platform === "reddit";

  const STEPS = isReddit ? ["Account", "Basics", "Content", "Subreddit"] : ["Account", "Basics", "Lyrics", "Style"];
  const STEP_TITLES = [
    "Choose the account",
    "Title and description",
    isReddit ? "Post content" : "Lyrics",
    isReddit ? "Subreddit and flair" : "Style prompt",
  ];
  const STEP_HINTS = [
    "Posts are scoped to one account so pacing and metadata stay separate.",
    "Write it once — AI suggestions arrive as a diff you accept or dismiss.",
    isReddit ? "Body text for the post. Keep it conversational; links go at the end." : "Paste the verse. AI checks spelling and meter against standard editions.",
    isReddit ? "Pick where it lands and the flair rules that apply." : "What Suno should hear. Tap a tag to add it, or let AI refine the whole prompt.",
  ];

  const canNext =
    (step === 0 && !!form.accountId) ||
    (step === 1 && form.title.trim().length > 0) ||
    (step === 2 && form.lyrics.trim().length > 0) ||
    step === 3;

  async function createPost() {
    setSaving(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, youtubeDescription: form.description }),
    });
    const post = await res.json();
    router.push(`/posts/${post.id}`);
  }

  function addChip(fieldKey: "stylePrompt" | "redditSubreddit", value: string) {
    if (fieldKey === "redditSubreddit") setForm({ ...form, redditSubreddit: value });
    else setForm({ ...form, stylePrompt: form.stylePrompt ? `${form.stylePrompt}, ${value}` : value });
  }

  return (
    <div>
      <Stepper steps={STEPS} currentIndex={step} onStepClick={setStep} />
      <div className="page">
        <div className="page-narrow">
          <div className="kicker">New post · {PLATFORM_LABELS[platform] || "select account"}</div>
          <h1>{STEP_TITLES[step]}</h1>
          <p className="sub">{STEP_HINTS[step]}</p>

          <div className="card">
            {step === 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {accounts.length === 0 && <div className="hint">No accounts yet — add one in Settings first.</div>}
                {accounts.map((a) => (
                  <div key={a.id} onClick={() => setForm({ ...form, accountId: a.id })}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, background: "var(--card-alt)", border: form.accountId === a.id ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,.07)", cursor: "pointer" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", border: "1px solid rgba(244,163,64,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{PLATFORM_ICONS[a.platform]}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{a.label}</div>
                      <div className="hint">{PLATFORM_LABELS[a.platform]}{!a.tokenEnvKey ? " · not connected" : ""}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {form.accountId === a.id ? "Selected" : "Available"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gap: 26 }}>
                <div>
                  <label>Title <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>Hindi or Sanskrit, 60 chars max</span></label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ flex: "1 1 320px" }} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <AiEnhance field="title" currentText={form.title} context={{ deity: form.deity, occasion: form.occasion, platform }} onAccept={(t) => setForm({ ...form, title: t })} />
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />
                <div>
                  <label>Description</label>
                  <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <div style={{ marginTop: 10 }}>
                    <AiEnhance field="description" currentText={form.description} context={{ deity: form.deity, occasion: form.occasion, platform }} onAccept={(t) => setForm({ ...form, description: t })} />
                  </div>
                  <label style={{ marginTop: 16 }}>Deity <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>optional, helps thumbnail + research</span></label>
                  <input value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} placeholder="e.g. Katyayani Devi" />
                  <label style={{ marginTop: 16 }}>Occasion <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>optional</span></label>
                  <input value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="e.g. Navratri Day 6" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <label>{isReddit ? "Post body" : "Lyrics"} <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>Devanagari or transliteration</span></label>
                <textarea rows={isReddit ? 10 : 12} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} />
                <div style={{ marginTop: 10 }}>
                  <AiEnhance field="lyrics" currentText={form.lyrics} context={{ deity: form.deity, occasion: form.occasion, platform }} onAccept={(t) => setForm({ ...form, lyrics: t })} />
                </div>
              </div>
            )}

            {step === 3 && !isReddit && (
              <div>
                <label>Style prompt <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>sent to Suno with the lyrics</span></label>
                <textarea rows={3} value={form.stylePrompt} onChange={(e) => setForm({ ...form, stylePrompt: e.target.value })} placeholder="slow devotional chant, male voice, tanpura drone, temple bells" />
                <div style={{ marginTop: 10 }}>
                  <AiEnhance field="style" currentText={form.stylePrompt} context={{ deity: form.deity, occasion: form.occasion, platform }} onAccept={(t) => setForm({ ...form, stylePrompt: t })} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14, alignItems: "center" }}>
                  <span className="hint" style={{ marginRight: 2 }}>Suggested style tags</span>
                  {STYLE_CHIPS.map((c) => <button key={c} className="chip" onClick={() => addChip("stylePrompt", c)}>+ {c}</button>)}
                </div>
                <label style={{ marginTop: 20 }}>Thumbnail template</label>
                <select value={form.thumbnailPromptTemplateId} onChange={(e) => setForm({ ...form, thumbnailPromptTemplateId: e.target.value })}>
                  {THUMBNAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <label style={{ marginTop: 16 }}>Your idea for the thumbnail <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>optional</span></label>
                <input value={form.thumbnailCustomIdea} onChange={(e) => setForm({ ...form, thumbnailCustomIdea: e.target.value })} placeholder="e.g. sunrise behind the temple" />
              </div>
            )}

            {step === 3 && isReddit && (
              <div>
                <label>Subreddit <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>without r/</span></label>
                <input value={form.redditSubreddit} onChange={(e) => setForm({ ...form, redditSubreddit: e.target.value })} placeholder={selectedAccount?.redditDefaultSubreddit || "e.g. hinduism"} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10, alignItems: "center" }}>
                  <span className="hint" style={{ marginRight: 2 }}>Suggested subs</span>
                  {SUBREDDIT_CHIPS.map((c) => <button key={c} className="chip" onClick={() => addChip("redditSubreddit", c)}>r/{c}</button>)}
                </div>
                <label style={{ marginTop: 16 }}>Flair <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>optional</span></label>
                <input value={form.redditFlair} onChange={(e) => setForm({ ...form, redditFlair: e.target.value })} />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              {step > 0 ? <button className="btn-secondary" onClick={() => setStep(step - 1)}>Back</button> : <span />}
              <span className="hint">Step {step + 1} of {STEPS.length}</span>
              {step < STEPS.length - 1 ? (
                <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={() => setStep(step + 1)} disabled={!canNext}>Continue</button>
              ) : (
                <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={createPost} disabled={saving || !canNext}>{saving ? "Creating…" : "Create post & open pipeline"}</button>
              )}
            </div>
          </div>
          <p className="hint">Steps adapt to the selected platform — switch Platform in the top bar to see the Reddit flow.</p>
        </div>
      </div>
    </div>
  );
}
