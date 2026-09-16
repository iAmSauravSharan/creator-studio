"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "./Stepper";

const THUMBNAIL_TEMPLATES = [
  { id: "temple-glow", name: "Temple Glow", description: "Warm temple silhouette with diyas — a safe, classic default." },
  { id: "iconographic-minimal", name: "Iconographic Minimal", description: "Clean, symbolic, calm and meditative." },
  { id: "nature-devotional", name: "Nature Devotional", description: "River ghat, mountain shrine, forest temple — slower mood." },
];

const PLATFORM_LABELS: Record<string, string> = { youtube: "▶️ YouTube", reddit: "👽 Reddit", x: "✖️ X / Twitter", instagram: "📸 Instagram" };

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountId: "", title: "", deity: "", occasion: "", lyrics: "", stylePrompt: "",
    thumbnailPromptTemplateId: "temple-glow", thumbnailCustomIdea: "",
    redditSubreddit: "", redditFlair: "",
  });

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const platform = selectedAccount?.platform ?? "";

  const STEPS = platform === "reddit"
    ? ["Account", "Basics", "Content", "Subreddit"]
    : ["Account", "Basics", "Lyrics", "Style & Vibe"];

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
      body: JSON.stringify(form),
    });
    const post = await res.json();
    router.push(`/posts/${post.id}`);
  }

  return (
    <div>
      <div className="hero">
        <div className="hero-emoji">🪔</div>
        <h1>Create a new post</h1>
        <div className="hero-sub">A few quick steps — they adapt to whichever platform you pick.</div>
      </div>

      <Stepper steps={STEPS} currentIndex={step} />

      <div className="card">
        {step === 0 && (
          <>
            <h2>Which account is this for?</h2>
            {accounts.length === 0 && (
              <div className="encourage">No accounts yet — add one in Settings first.</div>
            )}
            <label>Account</label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Select an account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{PLATFORM_LABELS[a.platform]} — {a.label}{!a.tokenEnvKey ? " (not connected)" : ""}</option>
              ))}
            </select>
          </>
        )}

        {step === 1 && (
          <>
            <h2>What's this post about?</h2>
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Katyayani Devi Aarti" />
            <label>Deity <span className="hint">Helps generate a consistent thumbnail and title later</span></label>
            <input value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} placeholder="e.g. Katyayani Devi" />
            <label>Occasion <span className="hint">Optional — festival, day, or context</span></label>
            <input value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="e.g. Navratri Day 6" />
          </>
        )}

        {step === 2 && platform === "reddit" && (
          <>
            <h2>Post content</h2>
            <label>Body text</label>
            <textarea rows={10} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} placeholder="What you want the Reddit post to say…" />
          </>
        )}
        {step === 2 && platform !== "reddit" && (
          <>
            <h2>Write or paste the lyrics</h2>
            <label>Lyrics <span className="hint">Add [Intro], [Verse], [Chorus], [Outro] tags if you have them</span></label>
            <textarea rows={12} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} placeholder="[Intro — instrumental]&#10;[Verse 1]&#10;..." />
          </>
        )}

        {step === 3 && platform === "reddit" && (
          <>
            <h2>Subreddit</h2>
            <label>Subreddit <span className="hint">Without r/ — leave blank to use the account's default</span></label>
            <input value={form.redditSubreddit} onChange={(e) => setForm({ ...form, redditSubreddit: e.target.value })} placeholder={selectedAccount?.redditDefaultSubreddit || "e.g. hinduism"} />
            <label>Flair <span className="hint">Optional</span></label>
            <input value={form.redditFlair} onChange={(e) => setForm({ ...form, redditFlair: e.target.value })} />
          </>
        )}
        {step === 3 && platform !== "reddit" && (
          <>
            <h2>Style & vibe</h2>
            <label>Style prompt for Suno</label>
            <input value={form.stylePrompt} onChange={(e) => setForm({ ...form, stylePrompt: e.target.value })} placeholder="devotional, harmonium, tabla, warm reverent vocals" />
            <label>Thumbnail template</label>
            <select value={form.thumbnailPromptTemplateId} onChange={(e) => setForm({ ...form, thumbnailPromptTemplateId: e.target.value })}>
              {THUMBNAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="hint" style={{ marginTop: -2, marginBottom: 4 }}>{THUMBNAIL_TEMPLATES.find((t) => t.id === form.thumbnailPromptTemplateId)?.description}</div>
            <label>Your idea for the thumbnail <span className="hint">Optional</span></label>
            <input value={form.thumbnailCustomIdea} onChange={(e) => setForm({ ...form, thumbnailCustomIdea: e.target.value })} placeholder="e.g. sunrise behind the temple" />
          </>
        )}

        <div className="btn-row">
          {step > 0 ? <button className="secondary" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext}>Next →</button>
          ) : (
            <button onClick={createPost} disabled={saving || !canNext}>{saving ? "Creating…" : "Create & continue 🪔"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
