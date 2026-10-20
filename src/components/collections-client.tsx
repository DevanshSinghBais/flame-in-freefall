"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, FolderOpen, Plus, Trash2 } from "lucide-react";

type Collection = { id: string; name: string; description: string | null; created_at: string; updated_at: string; itemCount: number };

export function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/collections", { headers: { accept: "application/json" } });
      const payload = await response.json() as { collections?: Collection[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Collections could not be loaded.");
      setCollections(payload.collections ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Collections could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const payload = await response.json() as { collection?: Collection; error?: { message?: string } };
      if (!response.ok) setMessage(payload.error?.message ?? "The collection could not be created.");
      else if (payload.collection) { setCollections((items) => [payload.collection!, ...items]); setName(""); setDescription(""); setMessage("Collection created."); }
    } catch { setMessage("The collection could not be created. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setMessage("");
    const response = await fetch(`/api/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "The collection could not be deleted."); return; }
    setCollections((items) => items.filter((item) => item.id !== id));
    setConfirmDelete(null);
    setMessage("Collection and its item links deleted.");
  }

  return (
    <div className="personal-page">
      <header className="workspace-heading"><div><p className="eyebrow">FLAME IN FREEFALL · PRIVATE RESEARCH</p><h1>Collections</h1><p className="workspace-lede">Organize saved NASA research into focused reading sets.</p></div><span className="workspace-scope"><FolderOpen size={14} aria-hidden="true" /> PRIVATE TO YOU</span></header>
      <section className="personal-data-section" aria-labelledby="create-collection-title">
        <div className="personal-section-heading"><div><p className="eyebrow">NEW RESEARCH SET</p><h2 id="create-collection-title">Create a collection</h2></div></div>
        <form className="collection-create-form" onSubmit={create}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={100} required placeholder="For example: Ignition studies" /></label>
          <label>Description <span>(optional)</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="A short private description" /></label>
          <button className="button button-primary" type="submit" disabled={busy || !name.trim()}><Plus size={16} aria-hidden="true" /> {busy ? "Creating…" : "Create collection"}</button>
        </form>
        {message && <p className="inline-status" role="status">{message}</p>}
      </section>
      <section className="personal-data-section" aria-labelledby="your-collections-title">
        <div className="personal-section-heading"><div><p className="eyebrow">YOUR RESEARCH SETS</p><h2 id="your-collections-title">Your collections</h2></div></div>
        {loading ? <p className="personal-loading" role="status">Loading your collections…</p> : error ? <div className="personal-error" role="alert"><p>{error}</p><button className="quiet-button" type="button" onClick={() => void load()}>Try again</button></div> : collections.length ? <ul className="collection-list">{collections.map((collection) => (
          <li className="collection-row" key={collection.id}>
            <Link className="collection-main" href={`/workspace/collections/${encodeURIComponent(collection.id)}`}><span className="collection-icon"><FolderOpen size={18} aria-hidden="true" /></span><span><strong>{collection.name}</strong><small>{collection.description || "No description"}</small></span><span className="collection-count">{collection.itemCount} {collection.itemCount === 1 ? "paper" : "papers"}</span><ArrowRight size={16} aria-hidden="true" /></Link>
            {confirmDelete === collection.id ? <span className="collection-confirm"><span>Delete this collection?</span><button className="quiet-button note-delete" type="button" onClick={() => void remove(collection.id)}>Confirm delete</button><button className="quiet-button" type="button" onClick={() => setConfirmDelete(null)}>Cancel</button></span> : <button className="quiet-button icon-action" type="button" onClick={() => setConfirmDelete(collection.id)} aria-label={`Delete collection ${collection.name}`}><Trash2 size={15} aria-hidden="true" /></button>}
          </li>
        ))}</ul> : <div className="personal-empty-state"><FolderOpen size={21} aria-hidden="true" /><h2>No collections yet</h2><p>Create a collection to group saved papers by topic, method, or reading priority.</p></div>}
      </section>
    </div>
  );
}
