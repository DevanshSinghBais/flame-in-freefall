"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FolderOpen, Trash2 } from "lucide-react";

type Paper = { id: string; nasa_id: string; canonical_url: string; title: string; abstract: string | null; authors: string[]; publication_date: string | null; center: string | null };
type Collection = { id: string; name: string; description: string | null };
type Payload = { collection: Collection; items: Array<Paper & { addedAt: string }>; availablePapers: Paper[] };

export function CollectionDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(id)}`, { headers: { accept: "application/json" } });
      const payload = await response.json() as Payload & { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "This collection could not be loaded.");
      setData(payload);
      setName(payload.collection.name);
      setDescription(payload.collection.description ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This collection could not be loaded."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function addPaper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(id)}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nasaId: selected }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "This paper could not be added.");
      setSelected(""); setMessage("Paper added to this collection."); await load();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "This paper could not be added."); }
    finally { setBusy(false); }
  }

  async function removePaper(nasaId: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(id)}/items`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nasaId }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "This paper could not be removed.");
      setMessage("Paper removed from this collection."); await load();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "This paper could not be removed."); }
    finally { setBusy(false); }
  }

  async function updateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const payload = await response.json() as { collection?: Collection; error?: { message?: string } };
      if (!response.ok || !payload.collection) throw new Error(payload.error?.message ?? "Collection settings could not be updated.");
      setData((current) => current ? { ...current, collection: payload.collection! } : current);
      setMessage("Collection details saved.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Collection settings could not be updated."); }
    finally { setBusy(false); }
  }

  async function deleteCollection() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The collection could not be deleted.");
      window.location.assign("/workspace/collections");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The collection could not be deleted."); setBusy(false); }
  }

  if (loading) return <div className="personal-loading" role="status">Loading collection…</div>;
  if (error || !data) return <div className="personal-error" role="alert"><p>{error || "This collection is unavailable."}</p><div className="collection-detail-actions"><Link className="quiet-button" href="/workspace/collections"><ArrowLeft size={15} aria-hidden="true" /> All collections</Link><button className="quiet-button" type="button" onClick={() => void load()}>Try again</button></div></div>;

  return (
    <div className="personal-page">
      <Link className="detail-back-link" href="/workspace/collections"><ArrowLeft size={15} aria-hidden="true" /> All collections</Link>
      <header className="workspace-heading collection-detail-heading"><div><p className="eyebrow">FLAME IN FREEFALL · PRIVATE COLLECTION</p><h1>{data.collection.name}</h1><p className="workspace-lede">{data.collection.description || "A private set of source-linked NASA research."}</p></div><span className="workspace-scope"><FolderOpen size={14} aria-hidden="true" /> {data.items.length} {data.items.length === 1 ? "PAPER" : "PAPERS"}</span></header>
      <section className="personal-data-section" aria-labelledby="collection-settings-title">
        <div className="personal-section-heading"><div><p className="eyebrow">COLLECTION DETAILS</p><h2 id="collection-settings-title">Edit details</h2></div></div>
        <form className="collection-create-form" onSubmit={updateCollection}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
          <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label>
          <button className="button button-secondary" type="submit" disabled={busy}>Save details</button>
        </form>
      </section>
      <section className="personal-data-section" aria-labelledby="add-saved-paper-title">
        <div className="personal-section-heading"><div><p className="eyebrow">FROM YOUR PAPER LIBRARY</p><h2 id="add-saved-paper-title">Add a saved paper</h2></div></div>
        {data.availablePapers.length ? <form className="collection-add-form" onSubmit={addPaper}><label htmlFor="collection-paper-select">Saved NASA paper<select id="collection-paper-select" value={selected} onChange={(event) => setSelected(event.target.value)} required><option value="">Select a saved paper</option>{data.availablePapers.map((paper) => <option key={paper.id} value={paper.nasa_id}>{paper.title} · NTRS {paper.nasa_id}</option>)}</select></label><button className="button button-primary" type="submit" disabled={busy || !selected}>Add paper</button></form> : <p className="personal-empty-inline">All your saved papers are already in this collection, or your Paper Library is empty. <Link href="/workspace/paper-library">Open Paper Library</Link></p>}
      </section>
      <section className="personal-data-section" aria-labelledby="collection-papers-title">
        <div className="personal-section-heading"><div><p className="eyebrow">SOURCE RECORDS</p><h2 id="collection-papers-title">Papers in this collection</h2></div></div>
        {data.items.length ? <ul className="collection-paper-list">{data.items.map((paper) => <li key={paper.id}>
          <div><p className="result-source-line"><span>NASA NTRS ID {paper.nasa_id}</span>{paper.publication_date && <span>{paper.publication_date.split("T")[0]}</span>}</p><h3><Link href={`/research/${encodeURIComponent(paper.nasa_id)}`}>{paper.title}</Link></h3><p className="saved-paper-meta">{paper.authors.length ? paper.authors.join("; ") : "Author metadata unavailable"}{paper.center ? ` · ${paper.center}` : ""}</p><a className="text-link" href={paper.canonical_url} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} aria-hidden="true" /></a></div>
          <button className="quiet-button icon-action" type="button" disabled={busy} onClick={() => void removePaper(paper.nasa_id)} aria-label={`Remove ${paper.title} from this collection`}><Trash2 size={15} aria-hidden="true" /></button>
        </li>)}</ul> : <div className="personal-empty-state"><FolderOpen size={21} aria-hidden="true" /><h2>This collection is empty</h2><p>Add a saved paper from your Paper Library. Search remains available from the overview.</p><Link href="/workspace/overview">Explore NASA research</Link></div>}
      </section>
      <section className="collection-danger-zone" aria-labelledby="delete-collection-title"><div><p className="eyebrow">COLLECTION CONTROL</p><h2 id="delete-collection-title">Delete collection</h2><p>Deleting this collection removes its item links. Saved papers and personal notes remain in your Paper Library.</p></div>{confirmDelete ? <div className="collection-confirm"><span>Are you sure?</span><button className="quiet-button note-delete" type="button" onClick={() => void deleteCollection()} disabled={busy}>Confirm delete</button><button className="quiet-button" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div> : <button className="quiet-button note-delete" type="button" onClick={() => setConfirmDelete(true)}>Delete collection</button>}</section>
      {message && <p className="inline-status" role="status">{message}</p>}
    </div>
  );
}
