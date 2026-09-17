"use client";
import { useEffect, useState } from "react";

type ThumbnailLayout = {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  isActive: boolean;
};

const BLANK = { name: "", description: "", promptTemplate: "" };

export default function ThumbnailTemplatesPage() {
  const [layouts, setLayouts] = useState<ThumbnailLayout[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetch(`/api/thumbnail-layouts?includeInactive=${showInactive ? "1" : "0"}`)
      .then((r) => r.json())
      .then(setLayouts);
  }
  useEffect(load, [showInactive]);

  function startAdd() {
    setEditingId(null);
    setForm(BLANK);
    setShowForm(true);
  }
  function startEdit(l: ThumbnailLayout) {
    setEditingId(l.id);
    setForm({ name: l.name, description: l.description, promptTemplate: l.promptTemplate });
    setShowForm(true);
  }
  async function save() {
    if (!form.name.trim() || !form.promptTemplate.trim()) return;
    if (editingId) {
      await fetch(`/api/thumbnail-layouts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/thumbnail-layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    load();
  }
  async function toggleActive(l: ThumbnailLayout) {
    // "Delete" in this screen is always a soft delete — see the API route
    // comment. Restoring is just flipping isActive back to true.
    if (l.isActive) {
      await fetch(`/api/thumbnail-layouts/${l.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/thumbnail-layouts/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
    }
    load();
  }

  return (
    <div className="page page-mid">
      <div className="kicker">Settings</div>
      <h1>Thumbnail templates</h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Each template is a reusable prompt skeleton — use {"{deity}"}, {"{occasion}"}, {"{custom_idea}"}
        as placeholders. Color scheme and art style come from Branding & thumbnails automatically.
      </p>

      <div className="card-plain">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3>All templates</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)" }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            <button className="btn-primary" onClick={startAdd}>+ Add template</button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {layouts.map((l) => (
            <div key={l.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14,
              background: "var(--card-alt)", border: "1px solid rgba(255,255,255,.07)",
              opacity: l.isActive ? 1 : 0.55,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.name}</div>
                <div className="hint">{l.description || "No description"}</div>
              </div>
              <span className="hint" style={{ flex: "none" }}>{l.isActive ? "Active" : "Inactive"}</span>
              <button className="btn-secondary" style={{ minHeight: 32, padding: "7px 12px", fontSize: 12 }} onClick={() => startEdit(l)}>Edit</button>
              <button className="btn-secondary" style={{ minHeight: 32, padding: "7px 12px", fontSize: 12 }} onClick={() => toggleActive(l)}>
                {l.isActive ? "Delete" : "Restore"}
              </button>
            </div>
          ))}
          {layouts.length === 0 && <p className="hint">No templates yet. Run the seed script or add one above.</p>}
        </div>
      </div>

      {showForm && (
        <div className="card-plain">
          <h3>{editingId ? "Edit template" : "New template"}</h3>
          <label style={{ marginTop: 10 }}>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Split Contrast" />
          <label style={{ marginTop: 14 }}>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One line — shown in the picker" />
          <label style={{ marginTop: 14 }}>Prompt skeleton</label>
          <textarea
            rows={4}
            value={form.promptTemplate}
            onChange={(e) => setForm({ ...form, promptTemplate: e.target.value })}
            placeholder="Use {deity}, {occasion}, {custom_idea} as placeholders..."
          />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn-primary" onClick={save} disabled={!form.name.trim() || !form.promptTemplate.trim()}>Save template</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
