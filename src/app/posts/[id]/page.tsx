"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Stepper from "../../Stepper";

const TEMPLATES = [
  { id: "temple-glow", name: "Temple Glow", description: "Temple silhouette with warm ambient light." },
  { id: "iconographic-minimal", name: "Iconographic Minimal", description: "Clean, symbolic, calm and meditative." },
  { id: "nature-devotional", name: "Nature Devotional", description: "River ghat, mountain shrine, forest temple." },
];

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

  async function refresh() {
    const res = await fetch(`/api/posts/${id}`);
    const data = await res.json();
    setPost(data);
    if (data.thumbnailPromptTemplateId) setTemplateId(data.thumbnailPromptTemplateId);
    if (data.thumbnailCustomIdea) setCustomIdea(data.thumbnailCustomIdea);
  }
  useEffect(() => { refresh(); }, [id]);

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
    await fetch(`/api/posts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    await refresh();
    setBusy(false);
  }

  async function schedule() {
    if (!publishAt) return alert("Pick a publish date/time first");
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/posts/${id}/schedule`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishAt: new Date(publishAt).toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Publishing failed");
    await refresh();
    setBusy(false);
  }

  if (!post) return <div className="card">Loading…</div>;

  const isReddit = post.platform === "reddit";
  const STEPS = isReddit ? REDDIT_STEPS : YT_STEPS;
  const stepIndex = isReddit ? redditStepIndex(post.status) : ytStepIndex(post.status);

  return (
    <div>
      <div className="hero">
        <div className="hero-emoji">{isReddit ? "👽" : "🎵"}</div>
        <h1>{post.title}</h1>
        <span className={`badge ${post.status}`}>{post.status}</span>
      </div>

      <Stepper steps={STEPS} currentIndex={stepIndex} />

      {isReddit ? (
        <>
          <div className="card">
            <h2>Review</h2>
            <label>Subreddit</label>
            <input value={post.redditSubreddit ?? ""} onChange={(e) => setPost({ ...post, redditSubreddit: e.target.value })} />
            <label>Flair</label>
            <input value={post.redditFlair ?? ""} onChange={(e) => setPost({ ...post, redditFlair: e.target.value })} />
            <label>Body</label>
            <textarea rows={8} value={post.lyrics ?? ""} readOnly />
            <div style={{ marginTop: 14 }}><button className="secondary" onClick={saveMetadata} disabled={busy}>Save changes</button></div>
          </div>
          <div className="card">
            <h2>Approve</h2>
            {["APPROVED", "SCHEDULED", "PUBLISHED"].includes(post.status) ? (
              <div className="encourage" style={{ marginBottom: 0 }}>Approved ✓</div>
            ) : (
              <button onClick={approve} disabled={busy}>Approve ✓</button>
            )}
          </div>
          <div className="card">
            <h2>Publish</h2>
            {post.redditPostId ? (
              <div className="encourage" style={{ marginBottom: 0 }}>🎉 Published — Reddit post ID: {post.redditPostId}</div>
            ) : post.status === "SCHEDULED" ? (
              <div className="hint">Waiting for the scheduled time — make sure `npm run scheduler` is running (see README).</div>
            ) : (
              <>
                <label>Publish date &amp; time <span className="hint">Pick now for immediate, or a future time to hold it</span></label>
                <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                <div style={{ marginTop: 14 }}><button onClick={schedule} disabled={busy || post.status !== "APPROVED"}>Publish to Reddit 🚀</button></div>
                {err && <div className="hint" style={{ color: "#ff8080", marginTop: 8 }}>{err}</div>}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <h2>1. Audio</h2>
            {post.finalAudioUrl ? (
              <audio controls src={post.finalAudioUrl} style={{ width: "100%", marginTop: 8 }} />
            ) : (
              <>
                <div className="hint" style={{ marginTop: -2 }}>Generate this in Suno, download it, then drop it here.</div>
                <input type="file" accept="audio/*" onChange={uploadAudio} style={{ marginTop: 10 }} />
              </>
            )}
          </div>

          <div className="card">
            <h2>2. Thumbnail</h2>
            {post.thumbnailUrl ? (
              <img src={post.thumbnailUrl} alt="thumbnail" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />
            ) : (
              <>
                <label>Template</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="hint">{TEMPLATES.find((t) => t.id === templateId)?.description}</div>
                <label>Your idea for this thumbnail</label>
                <input value={customIdea} onChange={(e) => setCustomIdea(e.target.value)} placeholder="e.g. sunrise behind the temple" />
                <div style={{ marginTop: 14 }}><button onClick={makeThumbnail} disabled={busy || !post.finalAudioUrl}>Generate thumbnail ✨</button></div>
              </>
            )}
          </div>

          <div className="card">
            <h2>3. Metadata</h2>
            <label>Description</label>
            <textarea rows={4} value={post.youtubeDescription ?? ""} onChange={(e) => setPost({ ...post, youtubeDescription: e.target.value })} />
            <label>Tags <span className="hint">Comma-separated</span></label>
            <input value={post.youtubeTags ?? ""} onChange={(e) => setPost({ ...post, youtubeTags: e.target.value })} />
            <div style={{ marginTop: 14 }}><button className="secondary" onClick={saveMetadata} disabled={busy}>Save metadata</button></div>
          </div>

          <div className="card">
            <h2>4. Approve</h2>
            {["APPROVED", "SCHEDULED", "PUBLISHED"].includes(post.status) ? (
              <div className="encourage" style={{ marginBottom: 0 }}>Approved ✓</div>
            ) : (
              <button onClick={approve} disabled={busy || !post.thumbnailUrl}>Approve ✓</button>
            )}
          </div>

          <div className="card">
            <h2>5. Publish</h2>
            {post.youtubeVideoId ? (
              <div className="encourage" style={{ marginBottom: 0 }}>🎉 Scheduled — YouTube video ID: {post.youtubeVideoId}</div>
            ) : (
              <>
                <label>Publish date &amp; time</label>
                <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                <div style={{ marginTop: 14 }}><button onClick={schedule} disabled={busy || post.status !== "APPROVED"}>Schedule on YouTube 🚀</button></div>
                {err && <div className="hint" style={{ color: "#ff8080", marginTop: 8 }}>{err}</div>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
