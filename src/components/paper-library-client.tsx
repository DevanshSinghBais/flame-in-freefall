"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, FileText, Search, Trash2 } from "lucide-react";
import type { Database, Json } from "@/lib/supabase/database.types";
import { SavedPaperButton } from "@/components/saved-paper-button";

type SavedPaper = Database["public"]["Tables"]["saved_papers"]["Row"];
type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"];
type Props = { papers: SavedPaper[]; notes: Record<string, string>; searches: SavedSearch[]; email: string | null };

function searchHref(search: SavedSearch) {
  const params = new URLSearchParams({ q: search.query });
  const filters = search.filters as Json;
  if (filters && typeof filters === "object" && !Array.isArray(filters)) {
    for (const key of ["stiType", "center", "subjectCategory"] as const) {
      const value = filters[key];
      if (typeof value === "string" && value) params.set(key, value);
    }
  }
  return `/workspace/research-explorer?${params.toString()}`;
}

function NoteEditor({ nasaId, initialContent }: { nasaId: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nasaId, content }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Your note could not be saved.");
      setMessage("Personal note saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your note could not be saved.");
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/notes?nasaId=${encodeURIComponent(nasaId)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Your note could not be removed.");
      setContent("");
      setMessage("Personal note removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your note could not be removed.");
    } finally { setBusy(false); }
  }

  return (
    <form className="personal-note-form" onSubmit={save}>
      <label htmlFor={`note-${nasaId}`}>Personal note</label>
      <textarea id={`note-${nasaId}`} value={content} onChange={(event) => setContent(event.target.value)} maxLength={20_000} rows={3} placeholder="Write a private note about this source…" />
      <div className="note-actions"><span>{content.length.toLocaleString()} / 20,000</span><button className="quiet-button" type="submit" disabled={busy || !content.trim()}>{busy ? "Saving…" : "Save note"}</button>{initialContent && <button className="quiet-button note-delete" type="button" disabled={busy} onClick={remove}>Remove note</button>}</div>
      {message && <p className="inline-status" role="status">{message}</p>}
    </form>
  );
}

function SavedSearchList({ searches: initialSearches }: { searches: SavedSearch[] }) {
  const [searches, setSearches] = useState(initialSearches);
  const [message, setMessage] = useState("");

  async function remove(id: string) {
    setMessage("");
    const response = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "This saved search could not be removed."); return; }
    setSearches((items) => items.filter((item) => item.id !== id));
    setMessage("Saved search removed.");
  }

  return (
    <section className="personal-data-section" aria-labelledby="saved-searches-heading">
      <div className="personal-section-heading"><div><p className="eyebrow">RESEARCH SHORTCUTS</p><h2 id="saved-searches-heading">Saved searches</h2><p>Queries and filters saved from the NASA research search.</p></div></div>
      {searches.length ? <ul className="saved-search-list">{searches.map((search) => (
        <li className="saved-search-row" key={search.id}>
          <span className="saved-search-icon"><Search size={17} aria-hidden="true" /></span>
          <div><strong>{search.name}</strong><p>{search.query}</p><small>{Object.values(search.filters as Record<string, unknown>).filter((value): value is string => typeof value === "string" && !!value).join(" · ") || "No filters"}</small></div>
          <Link className="quiet-button" href={searchHref(search)}>Run search</Link>
          <button className="quiet-button icon-action" type="button" onClick={() => void remove(search.id)} aria-label={`Remove saved search ${search.name}`}><Trash2 size={15} aria-hidden="true" /></button>
        </li>
      ))}</ul> : <div className="personal-empty-state"><Search size={20} aria-hidden="true" /><p>No saved searches yet. Save a query from Research Explorer.</p><Link href="/workspace/research-explorer">Open Research Explorer</Link></div>}
      {message && <p className="inline-status" role="status">{message}</p>}
    </section>
  );
}

export function PaperLibraryClient({ papers, notes, searches, email }: Props) {
  const [view, setView] = useState<"papers" | "searches">("papers");
  return (
    <div className="personal-page">
      <header className="workspace-heading">
        <div><p className="eyebrow">FLAME IN FREEFALL · PRIVATE RESEARCH</p><h1>Paper Library</h1><p className="workspace-lede">NASA source records saved to {email ? <strong>{email}</strong> : "your account"}.</p></div>
        <span className="workspace-scope"><Bookmark size={14} aria-hidden="true" /> PRIVATE TO YOU</span>
      </header>
      <div className="personal-tabs" role="tablist" aria-label="Paper Library views">
        <button role="tab" aria-selected={view === "papers"} className={view === "papers" ? "is-selected" : ""} onClick={() => setView("papers")} type="button">Saved papers <span>{papers.length}</span></button>
        <button role="tab" aria-selected={view === "searches"} className={view === "searches" ? "is-selected" : ""} onClick={() => setView("searches")} type="button">Saved searches <span>{searches.length}</span></button>
      </div>
      {view === "papers" ? (
        <section className="personal-data-section" aria-label="Saved papers">
          {papers.length ? <ul className="saved-paper-list">{papers.map((paper) => (
            <li className="saved-paper-row" key={paper.id}>
              <div className="saved-paper-main">
                <p className="result-source-line"><span>NASA NTRS ID {paper.nasa_id}</span><span>{paper.document_type ?? "NASA source record"}</span></p>
                <h2><Link href={`/research/${encodeURIComponent(paper.nasa_id)}`}>{paper.title}</Link></h2>
                {paper.abstract && <p className="saved-paper-abstract">{paper.abstract}</p>}
                <p className="saved-paper-meta">{paper.authors.length ? paper.authors.join("; ") : "Author metadata unavailable"}{paper.publication_date ? ` · ${paper.publication_date.split("T")[0]}` : ""}{paper.center ? ` · ${paper.center}` : ""}</p>
                <div className="saved-paper-actions"><a href={paper.canonical_url} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} aria-hidden="true" /></a><span>Retrieved {new Date(paper.source_retrieved_at).toLocaleDateString()}</span><SavedPaperButton nasaId={paper.nasa_id} accountState="signed-in" initialSaved returnTo="/workspace/paper-library" /></div>
                <NoteEditor nasaId={paper.nasa_id} initialContent={notes[paper.id] ?? ""} />
              </div>
              <Link className="icon-button saved-record-open" href={`/research/${encodeURIComponent(paper.nasa_id)}`} aria-label={`Open details for ${paper.title}`}><FileText size={17} aria-hidden="true" /></Link>
            </li>
          ))}</ul> : <div className="personal-empty-state"><Bookmark size={21} aria-hidden="true" /><h2>Your library is ready</h2><p>Save a source-linked NASA NTRS record to keep its verified metadata and your private notes together.</p><Link className="button button-secondary" href="/workspace/overview">Explore NASA research</Link></div>}
        </section>
      ) : <SavedSearchList searches={searches} />}
    </div>
  );
}
