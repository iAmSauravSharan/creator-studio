"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Stepper from "../../Stepper";
import { buildThumbnailPrompt } from "@/lib/thumbnail-templates";

const TEMPLATES = [
  { id: "temple-glow", name: "Temple Glow", description: "Temple silhouette, warm ambient light.", swatch: "radial-gradient(circle at 50% 38%,#f4a340,#7a2b12 62%,#1a0f09)" },
  { id: "iconographic-minimal", name: "Iconographic Minimal", description: "Clean, symbolic, calm.", swatch: "linear-gradient(140deg,#1d1815,#3a2314 70%,#f4a340)" },
  { id: "nature-devotional", name: "Nature Devotional", description: "River ghat, mountain shrine.", swatch: "linear-gradient(180deg,#ffb066,#ff8a5c 46%,#2a1408)" },
];
const IDEA_CHIPS = ["sunrise over the ghats", "temple silhouette at dusk", "marigold garlands", "brass diya glow"];

const YT_STEPS = ["Audio", "Thumbnail", "Metadata", "Approve", "Publish"];
const REDDIT_STEPS = ["Review", "Approve", "Publish"];

function ytStepIndex(status: string) {
  if (["DRAFT", "GENERATING"].includes(status)) return 0;
  if (["GENERATED", "NEEDS_EDIT", "POLISHING", "POLISHED"].includes(status)) return 1;
  if (status === "THUMBNAIL_READY") return 2;
  if (["APPROVED", "SCHEDULED", "PUBLISHED"].includes(status)) return 4;
  return 0;
}
function redditStepIndex(status: string) {
  if (status === "DRAFT") return 0;
  if (["APPROVED", "SCHEDULED", "PUBLISHED"].includes(status)) return 2;
  return 0;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState("temple-glow");
  const [customIdea, setCustomIdea] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/posts/${id}`);
    const data = await res.json();
    setPost(data);
    if (data.thumbnailPromptTemplateId) setTemplateId(data.thumbnailPromptTemplateId);
    if (data.thumbnailCustomIdea) setCustomIdea(data.thumbnailCustomIdea);
  }
  useEffect(() => { refresh(); }, [id]);

  function openSuno() {
    navigator.clipboard.writeText(post.stylePrompt || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open("https://suno.com/create", "_blank", "noopener");
  }

  async function uploadAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("audio", file);
    await fetch(`/api/posts/${id}/upload-audio`, { method: "POST", body: fd });
    await refresh();
    setBusy(false);
  }

  async function makeThumbnail() {
    setBusy(true);
    await fetch(`/api/posts/${id}/thumbnail`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, customIdea }),
    });
    await refresh();
    setBusy(false);
  }

  async function saveMetadata() {
    setBusy(true);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeDescription: post.youtubeDescription, youtubeTags: post.youtubeTags, redditSubreddit: post.redditSubreddit, redditFlair: post.redditFlair }),
    });
    await refresh();
    setBusy(false);
  }

  async function approve() {
    setBusy(true);
    await fetch(`/api/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "APPROVED" }) });
    await refresh();
    setBusy(false);
  }

  async function schedule() {
    if (!publishAt) return alert("Pick a publish date/time first");
    setBusy(true); setErr("");
    const res = await fetch(`/api/posts/${id}/schedule`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishAt: new Date(publishAt).toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Publishing failed");
    await refresh();
    setBusy(false);
  }

  if (!post) return <div className="page"><div className="card">Loading…</div></div>;

  const isReddit = post.platform === "reddit";
  const STEPS = isReddit ? REDDIT_STEPS : YT_STEPS;
  const stepIndex = isReddit ? redditStepIndex(post.status) : ytStepIndex(post.status);

  const promptPreview = buildThumbnailPrompt({
    templateId, customIdea, deity: post.deity ?? "", occasion: post.occasion ?? "",
    brandColorScheme: "warm gold and saffron tones", brandArtStyle: "stylized, painterly, not photorealistic",
    nicheDescription: "Hindu devotional, Hindi/Sanskrit",
  });

  return (
    <div>
      <Stepper steps={STEPS} currentIndex={stepIndex} />
      <div className="page">
        <div className="kicker">Post · {post.platform === "youtube" ? "YouTube" : "Reddit"}</div>
        <h1>{post.title}</h1>
        <p className="sub">Status: {post.status}</p>

        {isReddit ? (
          <>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span className="locked-dot" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#20160c", border: "none" }}>1</span>
                <h2>Review</h2>
              </div>
              <label>Subreddit</label>
              <input value={post.redditSubreddit ?? ""} onChange={(e) => setPost({ ...post, redditSubreddit: e.target.value })} />
              <label style={{ marginTop: 14 }}>Flair</label>
              <input value={post.redditFlair ?? ""} onChange={(e) => setPost({ ...post, redditFlair: e.target.value })} />
              <label style={{ marginTop: 14 }}>Body</label>
              <textarea rows={8} value={post.lyrics ?? ""} readOnly />
              <button className="btn-secondary" style={{ marginTop: 14 }} onClick={saveMetadata} disabled={busy}>Save changes</button>
            </div>
            <div className="card">
              <h2>Approve</h2>
              {["APPROVED", "SCHEDULED", "PUBLISHED"].includes(post.status) ? <p className="hint">Approved ✓</p> : <button className="btn-primary" style={{ marginTop: 12 }} onClick={approve} disabled={busy}>Approve</button>}
            </div>
            <div className="card">
              <h2>Publish</h2>
              {post.redditPostId ? <p className="hint">🎉 Published — Reddit post ID: {post.redditPostId}</p> : post.status === "SCHEDULED" ? (
                <p className="hint">Waiting for the scheduled time — make sure `npm run scheduler` is running.</p>
              ) : (
                <>
                  <label style={{ marginTop: 12 }}>Publish date &amp; time</label>
                  <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                  <button className="btn-primary" style={{ marginTop: 14 }} onClick={schedule} disabled={busy || post.status !== "APPROVED"}>Publish to Reddit</button>
                  {err && <div className="hint" style={{ color: "#ff8080", marginTop: 8 }}>{err}</div>}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ border: "1px solid rgba(244,163,64,.28)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span className="locked-dot" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#20160c", border: "none" }}>1</span>
                <h2>Audio</h2>
              </div>
              <p className="sub" style={{ marginLeft: 34, marginBottom: 18 }}>Generate the track in Suno with your style prompt, then bring the file back here. Either path works.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginLeft: 34 }}>
                <button onClick={openSuno} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 18, borderRadius: 16, background: "linear-gradient(130deg, rgba(244,163,64,.16), rgba(255,138,92,.08))", border: "1px solid rgba(244,163,64,.45)", textAlign: "left" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#ffd9a8" }}>🎵 Open Suno to generate</span>
                  <span className="hint">{copied ? "Style prompt copied to clipboard ✓" : "Copies your style prompt to the clipboard first."}</span>
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 18, borderRadius: 16, background: "var(--card-alt)", border: "1px dashed rgba(255,255,255,.16)" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Upload your downloaded file</span>
                  <span className="hint">MP3 or WAV</span>
                  {post.finalAudioUrl ? <audio controls src={post.finalAudioUrl} style={{ width: "100%" }} /> : <input type="file" accept="audio/*" onChange={uploadAudio} />}
                </div>
              </div>
            </div>

            {post.finalAudioUrl ? (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span className="locked-dot" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#20160c", border: "none" }}>2</span>
                  <h2>Thumbnail</h2>
                </div>
                <p className="sub" style={{ marginLeft: 34, marginBottom: 18 }}>Pick a template, add your idea, and check the prompt before it goes to the image model.</p>
                <div style={{ marginLeft: 34 }}>
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt="thumbnail" style={{ maxWidth: "100%", borderRadius: 12 }} />
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
                        {TEMPLATES.map((t) => (
                          <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ textAlign: "left", padding: 0, borderRadius: 16, overflow: "hidden", background: "var(--card-alt)", border: templateId === t.id ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,.09)" }}>
                            <span style={{ display: "block", height: 88, background: t.swatch, opacity: templateId === t.id ? 1 : 0.72 }} />
                            <span style={{ display: "block", padding: "12px 13px" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 800 }}>{t.name} {templateId === t.id && <span style={{ color: "var(--accent)" }}>✓</span>}</span>
                              <span className="hint" style={{ display: "block", marginTop: 3 }}>{t.description}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <label style={{ marginTop: 20 }}>Your idea</label>
                      <input value={customIdea} onChange={(e) => setCustomIdea(e.target.value)} placeholder="e.g. sunrise behind the temple" />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                        {IDEA_CHIPS.map((c) => <button key={c} className="chip" onClick={() => setCustomIdea(c)}>{c}</button>)}
                      </div>
                      <div className="card-flat" style={{ marginTop: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                          <span className="suggestion-tag">Prompt preview</span>
                          <span className="hint">live · exactly what's sent to the image model</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#d8cec3", fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-word" }}>{promptPreview}</p>
                      </div>
                      <button className="btn-primary" style={{ marginTop: 16 }} onClick={makeThumbnail} disabled={busy}>Generate thumbnail</button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="locked-step"><span className="locked-dot">2</span><div><h2 style={{ fontSize: 16 }}>Thumbnail</h2><p className="hint">Add audio first</p></div></div>
            )}

            {post.thumbnailUrl && (
              <div className="card">
                <h2 style={{ marginBottom: 14 }}>Metadata</h2>
                <label>Description</label>
                <textarea rows={4} value={post.youtubeDescription ?? ""} onChange={(e) => setPost({ ...post, youtubeDescription: e.target.value })} />
                <label style={{ marginTop: 14 }}>Tags <span className="hint" style={{ textTransform: "none", fontWeight: 400 }}>comma-separated</span></label>
                <input value={post.youtubeTags ?? ""} onChange={(e) => setPost({ ...post, youtubeTags: e.target.value })} />
                <button className="btn-secondary" style={{ marginTop: 14 }} onClick={saveMetadata} disabled={busy}>Save metadata</button>
              </div>
            )}

            {post.thumbnailUrl && (
              <div className="card">
                <h2 style={{ marginBottom: 14 }}>Approve</h2>
                {["APPROVED", "SCHEDULED", "PUBLISHED"].includes(post.status) ? <p className="hint">Approved ✓</p> : <button className="btn-primary" onClick={approve} disabled={busy}>Approve</button>}
              </div>
            )}

            {["APPROVED", "SCHEDULED", "PUBLISHED"].includes(post.status) && (
              <div className="card">
                <h2 style={{ marginBottom: 14 }}>Publish</h2>
                {post.youtubeVideoId ? <p className="hint">🎉 Scheduled — YouTube video ID: {post.youtubeVideoId}</p> : (
                  <>
                    <label>Publish date &amp; time</label>
                    <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                    <button className="btn-primary" style={{ marginTop: 14 }} onClick={schedule} disabled={busy}>Schedule on YouTube</button>
                    {err && <div className="hint" style={{ color: "#ff8080", marginTop: 8 }}>{err}</div>}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
