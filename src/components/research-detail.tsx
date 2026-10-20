"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, RefreshCw } from "lucide-react";
import type { NtrsRecord } from "@/lib/ntrs-provider-core";
import { SavedPaperButton, type SavedPaperAccountState } from "@/components/saved-paper-button";

type DetailError = { error?: { code?: string; message?: string } };

function doiHref(doi: string): string | undefined {
  const value = doi.trim();
  if (/^https:\/\/(doi\.org|dx\.doi\.org)\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && ["doi.org", "dx.doi.org"].includes(url.hostname) && !url.username && !url.password) return url.toString();
    } catch {
      return undefined;
    }
  }
  if (/^10\.\d{4,9}\/\S+$/i.test(value)) {
    return `https://doi.org/${value.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
  }
  return undefined;
}

export function ResearchDetail({ id, accountState, initialSaved }: { id: string; accountState: SavedPaperAccountState; initialSaved: boolean }) {
  const [record, setRecord] = useState<NtrsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DetailError["error"] | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/research/${encodeURIComponent(id)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json() as NtrsRecord & DetailError;
        if (!response.ok) {
          const cause = new Error(payload.error?.message ?? "NASA NTRS could not load this record.") as Error & { code?: string };
          cause.code = payload.error?.code;
          throw cause;
        }
        setRecord(payload);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        const detail = cause instanceof Error ? cause as Error & { code?: string } : null;
        setError({ code: detail?.code ?? "upstream", message: detail?.message ?? "NASA NTRS could not load this record." });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, reload]);

  if (loading) {
    return (
      <div className="research-detail-state" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <h1>Loading NASA research record</h1>
        <p>Retrieving citation {id} from NASA NTRS.</p>
      </div>
    );
  }

  if (error || !record) {
    const notFound = error?.code === "not_found";
    return (
      <section className="research-detail-state research-detail-error" role="alert">
        <p className="eyebrow">NASA NTRS RECORD</p>
        <h1>{notFound ? "Research record not found" : "Research record unavailable"}</h1>
        <p>{error?.message ?? "NASA NTRS did not return a record for this citation."}</p>
        <div className="detail-actions">
          <Link className="quiet-button" href="/workspace/overview"><ArrowLeft size={15} aria-hidden="true" /> Back to research</Link>
          {!notFound && <button className="quiet-button" type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw size={15} aria-hidden="true" /> Try again</button>}
        </div>
      </section>
    );
  }

  return (
    <article className="research-detail">
      <Link className="detail-back-link" href="/workspace/overview"><ArrowLeft size={15} aria-hidden="true" /> Back to research overview</Link>
      <header className="research-detail-header">
        <p className="eyebrow">LIVE NASA TECHNICAL REPORTS SERVER RECORD</p>
        <h1>{record.title}</h1>
        <div className="detail-source-line">
          <span>NASA NTRS citation ID <strong>{record.id}</strong></span>
          <SavedPaperButton nasaId={record.id} accountState={accountState} initialSaved={initialSaved} returnTo={`/research/${encodeURIComponent(record.id)}`} />
          <a href={record.canonicalUrl} target="_blank" rel="noreferrer">Open canonical source <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </header>

      <section className="detail-metadata" aria-labelledby="detail-metadata-heading">
        <h2 id="detail-metadata-heading">Record metadata</h2>
        <dl>
          {record.authors.length > 0 && <div><dt>Authors</dt><dd>{record.authors.join("; ")}</dd></div>}
          {record.publicationDate && <div><dt>Publication date</dt><dd>{record.publicationDate.split("T")[0]}</dd></div>}
          {record.documentType && <div><dt>NASA document type</dt><dd>{record.documentType}</dd></div>}
          {record.center && <div><dt>NASA center</dt><dd>{record.center}</dd></div>}
          {record.subjectCategories.length > 0 && <div><dt>Subject categories</dt><dd>{record.subjectCategories.join("; ")}</dd></div>}
          {record.doi && <div><dt>DOI</dt><dd>{doiHref(record.doi)
            ? <a href={doiHref(record.doi)} target="_blank" rel="noreferrer">{record.doi} <ArrowUpRight size={13} aria-hidden="true" /></a>
            : record.doi}</dd></div>}
        </dl>
      </section>

      <section className="detail-abstract" aria-labelledby="detail-abstract-heading">
        <div className="detail-section-heading"><span className="semantic-marker" aria-hidden="true" /><h2 id="detail-abstract-heading">Abstract</h2></div>
        {record.abstract
          ? <p>{record.abstract}</p>
          : <p className="detail-missing-metadata">NASA NTRS did not provide an abstract for this record.</p>}
      </section>

      <section className="detail-full-text" aria-labelledby="detail-full-text-heading">
        <div className="detail-section-heading"><span className="semantic-marker" aria-hidden="true" /><h2 id="detail-full-text-heading">Full text and source</h2></div>
        {record.fullTextLinks.length > 0 ? (
          <ul>
            {record.fullTextLinks.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true" /> {link.label} <ArrowUpRight size={14} aria-hidden="true" /></a></li>)}
          </ul>
        ) : <p className="detail-missing-metadata">No full-text download links were provided in the NASA NTRS record.</p>}
        <p className="detail-provenance">This page displays metadata returned by NASA NTRS and keeps the provider identifier and canonical source link visible for traceability.</p>
      </section>
    </article>
  );
}
