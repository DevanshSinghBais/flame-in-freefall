"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, FileText } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type SavedPaper = Database["public"]["Tables"]["saved_papers"]["Row"];

export function ResearchReportClient({ papers, notes }: { papers: SavedPaper[]; notes: Record<string, string> }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(papers.map((paper) => paper.id)));
  const selectedPapers = papers.filter((paper) => selected.has(paper.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function downloadReport() {
    const lines = [
      "# FLAME IN FREEFALL — Research report",
      "",
      "This report was assembled from records in your private Paper Library.",
      "Published source metadata and abstracts are separated from private user notes. No AI synthesis or new scientific conclusions are included.",
      "",
      "## Published evidence",
      "",
    ];
    for (const paper of selectedPapers) {
      lines.push(`### ${paper.title}`, "", `- NASA NTRS ID: ${paper.nasa_id}`, `- Canonical source: ${paper.canonical_url}`);
      if (paper.publication_date) lines.push(`- Publication date: ${paper.publication_date}`);
      if (paper.document_type) lines.push(`- Document type: ${paper.document_type}`);
      if (paper.doi) lines.push(`- DOI: ${paper.doi}`);
      if (paper.authors.length) lines.push(`- Authors: ${paper.authors.join("; ")}`);
      if (paper.abstract) {
        lines.push("", "Published abstract (stored from NASA NTRS metadata):", "", ...paper.abstract.split("\n").map((line) => `> ${line}`));
      }
      lines.push("", "---", "");
    }
    lines.push("## Personal notes and interpretation", "");
    for (const paper of selectedPapers) {
      lines.push(`### ${paper.title}`, "", `NASA NTRS ID: ${paper.nasa_id}`, "");
      const note = notes[paper.id]?.trim();
      if (note) lines.push("User-authored private note (not published evidence):", "", ...note.split("\n"), "");
      else lines.push("No personal note is stored for this record.", "");
      lines.push("---", "");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "flame-in-freefall-research-report.md";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="personal-page reports-page">
      <header className="workspace-heading"><div><p className="eyebrow">PRIVATE, SOURCE-LINKED EXPORT</p><h1>Reports</h1><p className="workspace-lede">Build a Markdown report from saved NASA records and keep your notes distinct from published evidence.</p></div><span className="workspace-scope"><FileText size={14} aria-hidden="true" /> LOCAL EXPORT</span></header>
      <section className="personal-data-section" aria-labelledby="report-scope-title">
        <div className="personal-section-heading"><div><p className="eyebrow">REPORT SCOPE</p><h2 id="report-scope-title">Choose saved records</h2><p>Source metadata is loaded from your authenticated Paper Library. The report is generated in your browser and is not stored on the server.</p></div><div className="report-selection-actions"><button className="quiet-button" type="button" onClick={() => setSelected(new Set(papers.map((paper) => paper.id)))} disabled={!papers.length}>Select all</button><button className="quiet-button" type="button" onClick={() => setSelected(new Set())} disabled={!selected.size}>Clear selection</button></div></div>
        {papers.length ? <ul className="report-record-list">{papers.map((paper) => <li key={paper.id}>
          <label><input type="checkbox" checked={selected.has(paper.id)} onChange={() => toggle(paper.id)} /><span><strong>{paper.title}</strong><small>NASA NTRS ID {paper.nasa_id}{paper.publication_date ? ` · ${paper.publication_date.split("T")[0]}` : ""}</small></span></label>
          <a className="report-source-link" href={paper.canonical_url} target="_blank" rel="noreferrer">NASA source <ArrowUpRight size={13} aria-hidden="true" /></a>
          {notes[paper.id]?.trim() && <p className="report-note-presence">Private note included under a separate user-interpretation heading.</p>}
        </li>)}</ul> : <div className="personal-empty-state"><FileText size={21} aria-hidden="true" /><h2>Your Paper Library is empty</h2><p>Save source records before creating a source-linked report.</p><Link href="/workspace/research-explorer">Explore NASA research</Link></div>}
        <div className="report-export-row"><span>{selectedPapers.length} {selectedPapers.length === 1 ? "record" : "records"} selected</span><button className="button button-primary" type="button" onClick={downloadReport} disabled={!selectedPapers.length}><Download size={15} aria-hidden="true" /> Download Markdown report</button></div>
      </section>
      {!!selectedPapers.length && <section className="personal-data-section" aria-labelledby="report-preview-title"><div className="personal-section-heading"><div><p className="eyebrow">REPORT PREVIEW</p><h2 id="report-preview-title">Published evidence and your notes</h2></div></div><div className="report-preview-split"><div className="report-preview-evidence"><p className="semantic-label">PUBLISHED EVIDENCE</p><p>Each selected record includes the source-provided title, identifier, canonical NASA URL, available metadata, and abstract when available.</p></div><div className="report-preview-notes"><p className="semantic-label">PERSONAL INTERPRETATION</p><p>Your private notes are labeled as user-authored and separated from publication metadata. This export does not add generated scientific conclusions.</p></div></div></section>}
    </div>
  );
}
