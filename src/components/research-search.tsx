"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, Flame, GitCompare, Search, SlidersHorizontal, X } from "lucide-react";
import type { NtrsFacet, NtrsSearchResult } from "@/lib/ntrs-provider-core";
import { SavedPaperButton } from "@/components/saved-paper-button";

const EXPLORER_PAGE_SIZE = 10;
const OVERVIEW_PAGE_SIZE = 4;
const INITIAL_QUERY = "microgravity combustion";
type SaveAccess = "checking" | "signed-in" | "signed-out" | "unavailable";

type ApiErrorPayload = { error?: { message?: string } };

function FacetSelect({
  label,
  allLabel,
  value,
  facets,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  facets: NtrsFacet[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select-wrap">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="">{allLabel}</option>
        {facets.map((facet) => (
          <option key={facet.value} value={facet.value}>
            {facet.value}{facet.count !== undefined ? ` (${facet.count.toLocaleString()})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ResearchSearch({ initialQuery = INITIAL_QUERY, initialFilters = { stiType: "", center: "", subjectCategory: "" }, variant = "explorer", isAuthenticated = false }: {
  initialQuery?: string;
  initialFilters?: { stiType: string; center: string; subjectCategory: string };
  variant?: "overview" | "explorer";
  isAuthenticated?: boolean;
}) {
  const pageSize = variant === "overview" ? OVERVIEW_PAGE_SIZE : EXPLORER_PAGE_SIZE;
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [stiType, setStiType] = useState(initialFilters.stiType);
  const [center, setCenter] = useState(initialFilters.center);
  const [subjectCategory, setSubjectCategory] = useState(initialFilters.subjectCategory);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NtrsSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queryError, setQueryError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveAccess, setSaveAccess] = useState<SaveAccess>("checking");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [saveSearchBusy, setSaveSearchBusy] = useState(false);
  const [saveSearchMessage, setSaveSearchMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: submittedQuery, page: String(page), pageSize: String(pageSize) });
    if (stiType) params.set("stiType", stiType);
    if (center) params.set("center", center);
    if (subjectCategory) params.set("subjectCategory", subjectCategory);

    setLoading(true);
    setError("");
    setSaveAccess(isAuthenticated ? "checking" : "signed-out");
    setSavedIds(new Set());
    fetch(`/api/research?${params.toString()}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json() as NtrsSearchResult & ApiErrorPayload;
        if (!response.ok) throw new Error(payload.error?.message ?? "NASA NTRS search could not be completed.");
        setData(payload);
        const ids = payload.results.map((record) => record.id);
        if (ids.length && isAuthenticated) {
          void fetch(`/api/library?ids=${encodeURIComponent(ids.join(","))}`, { signal: controller.signal, headers: { accept: "application/json" } })
            .then(async (statusResponse) => {
              if (statusResponse.status === 401) { setSaveAccess("signed-out"); return; }
              if (!statusResponse.ok) { setSaveAccess("unavailable"); return; }
              const statusPayload = await statusResponse.json() as { savedIds?: string[] };
              setSavedIds(new Set(statusPayload.savedIds ?? []));
              setSaveAccess("signed-in");
            })
            .catch(() => { if (!controller.signal.aborted) setSaveAccess("unavailable"); });
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "NASA NTRS search could not be completed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [submittedQuery, page, pageSize, stiType, center, subjectCategory, refreshKey, isAuthenticated]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setQueryError("Enter a search term to find NASA research.");
      return;
    }
    if (trimmed.length > 300) {
      setQueryError("Search terms must be 300 characters or fewer.");
      return;
    }
    setQueryError("");
    if (trimmed === submittedQuery && page === 1) setRefreshKey((value) => value + 1);
    setSubmittedQuery(trimmed);
    setPage(1);
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setStiType("");
    setCenter("");
    setSubjectCategory("");
    setPage(1);
    setQueryError("");
  }

  async function saveSearch() {
    setSaveSearchBusy(true);
    setSaveSearchMessage("");
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: submittedQuery,
          query: submittedQuery,
          filters: { ...(stiType ? { stiType } : {}), ...(center ? { center } : {}), ...(subjectCategory ? { subjectCategory } : {}) },
        }),
      });
      const payload = await response.json() as ApiErrorPayload;
      if (response.status === 401) { setSaveSearchMessage("Sign in to save this search."); return; }
      if (!response.ok) throw new Error(payload.error?.message ?? "This search could not be saved.");
      setSaveSearchMessage("Search saved to your Paper Library.");
    } catch (cause) {
      setSaveSearchMessage(cause instanceof Error ? cause.message : "This search could not be saved.");
    } finally { setSaveSearchBusy(false); }
  }

  const resultLimit = data ? Math.min(data.total, 10_000) : 0;
  const lastPage = Math.max(1, Math.ceil(resultLimit / pageSize));
  const firstResult = data && data.results.length ? (page - 1) * pageSize + 1 : 0;
  const lastResult = data && data.results.length ? firstResult + data.results.length - 1 : 0;
  const countText = data
    ? data.total === 0
      ? "0 results"
      : `${firstResult.toLocaleString()}–${lastResult.toLocaleString()} of ${data.totalIsEstimate ? "about " : ""}${data.total.toLocaleString()} results`
    : "";
  const explorerParams = new URLSearchParams({ q: submittedQuery });
  if (stiType) explorerParams.set("stiType", stiType);
  if (center) explorerParams.set("center", center);
  if (subjectCategory) explorerParams.set("subjectCategory", subjectCategory);
  const explorerHref = `/workspace/research-explorer?${explorerParams.toString()}`;

  return (
    <section className={`research-search-section${variant === "overview" ? " research-search-overview" : ""}`} aria-labelledby="search-section-heading">
      <h2 className="sr-only" id="search-section-heading">Search NASA Technical Reports Server research</h2>
      <form className="research-search-form" onSubmit={submitSearch} role="search">
        <Search size={22} strokeWidth={1.8} aria-hidden="true" />
        <label className="sr-only" htmlFor="research-query">Search NASA research</label>
        <input
          id="research-query"
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setQueryError(""); }}
          placeholder="Search microgravity combustion research"
          autoComplete="off"
          aria-describedby={queryError ? "research-query-error" : undefined}
          aria-invalid={queryError ? true : undefined}
        />
        <button className="button button-primary search-submit" type="submit" disabled={loading && query.trim() === submittedQuery}>
          Search <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      </form>
      {queryError && <p className="field-error" id="research-query-error" role="alert">{queryError}</p>}
      <div className="filter-row">
        <span className="filter-intro"><SlidersHorizontal size={15} aria-hidden="true" /> Filter by</span>
        <FacetSelect label="NASA document type" allLabel="All document types" value={stiType} facets={data?.facets.stiTypes ?? []} onChange={(value) => updateFilter(setStiType, value)} />
        <FacetSelect label="NASA center" allLabel="All NASA centers" value={center} facets={data?.facets.centers ?? []} onChange={(value) => updateFilter(setCenter, value)} />
        <FacetSelect label="NASA subject category" allLabel="All subject categories" value={subjectCategory} facets={data?.facets.subjectCategories ?? []} onChange={(value) => updateFilter(setSubjectCategory, value)} />
        <button className="quiet-button clear-filters" type="button" onClick={clearFilters} disabled={!stiType && !center && !subjectCategory}>
          <X size={14} aria-hidden="true" /> Clear filters
        </button>
        <span className="source-scope">NASA Technical Reports Server</span>
      </div>
      <div className={variant === "overview" ? "dashboard-overview-grid" : "explorer-results"}>
        {variant === "overview" && <section className="continue-research" aria-labelledby="continue-heading">
          <div className="subsection-heading">
            <div><h3 id="continue-heading">Research shortcuts</h3><p>Move from discovery to comparison.</p></div>
          </div>
          <div className="shortcut-list">
            <Link className="shortcut-row" href="/workspace/research-explorer?q=microgravity%20combustion">
              <span className="shortcut-icon"><Search size={18} aria-hidden="true" /></span>
              <span><strong>Explore NASA research</strong><small>Search live NTRS records</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="shortcut-row" href="/workspace/experiment-comparison">
              <span className="shortcut-icon"><GitCompare size={18} aria-hidden="true" /></span>
              <span><strong>Compare source records</strong><small>Review returned metadata side by side</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="shortcut-row" href="/workspace/scenario-explorer">
              <span className="shortcut-icon"><Flame size={18} aria-hidden="true" /></span>
              <span><strong>Explore a scenario</strong><small>Review documented conditions</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>}
        <section className={`recent-research${variant === "explorer" ? " explorer-results-panel" : ""}`} aria-labelledby="recent-research-heading">
          <div className="subsection-heading recent-heading">
            <div><h3 id="recent-research-heading">{variant === "overview" ? "Recent research" : "NASA research results"}</h3><p>Live publication metadata from NASA NTRS</p></div>
            <div className="research-heading-actions">
              {data && <span className="result-count">{countText}</span>}
              {variant === "overview"
                ? <Link className="quiet-button view-all-results" href={explorerHref}>View all <ArrowRight size={14} aria-hidden="true" /></Link>
                : data && <button type="button" className="quiet-button save-search-button" onClick={() => void saveSearch()} disabled={saveSearchBusy || loading}>{saveSearchBusy ? "Saving…" : "Save search"}</button>}
            </div>
          </div>
          {saveSearchMessage && <p className="inline-status" role="status">{saveSearchMessage}{saveSearchMessage === "Sign in to save this search." && <> <Link href={`/sign-in?next=${encodeURIComponent("/workspace/overview")}`}>Sign in</Link></>}</p>}
          <div className="research-result-list" aria-live="polite" aria-relevant="additions text" aria-busy={loading}>
            {loading && (
              <div className="search-loading-state" role="status" aria-label={`Searching NASA NTRS for ${submittedQuery}`}>
                <span className="loading-spinner" aria-hidden="true" />
                <div className="research-loading-copy"><h4>Searching NASA NTRS</h4><p>Retrieving source records for “{submittedQuery}”.</p></div>
                <div className="research-loading-lines" aria-hidden="true"><i /><i /><i /></div>
              </div>
            )}
            {!loading && error && (
              <div className="empty-search-state search-error-state" role="alert">
                <span className="empty-state-mark" aria-hidden="true"><X size={18} /></span>
                <div><h4>Research search is temporarily unavailable</h4><p>{error}</p></div>
                <button type="button" className="quiet-button" onClick={() => setRefreshKey((value) => value + 1)}>Try again</button>
              </div>
            )}
            {!loading && !error && data?.results.map((record, index) => (
              <article className="research-result-row" key={record.id}>
                <span className="result-document-icon" aria-hidden="true"><FileText size={17} strokeWidth={1.7} /></span>
                <div className="result-content">
                  <div className="result-title-row">
                    <h4><Link href={`/research/${encodeURIComponent(record.id)}`}>{record.title}</Link></h4>
                    {record.documentType && <span className="source-type-label">{record.documentType}</span>}
                  </div>
                  {variant === "explorer" && record.abstract && <p>{record.abstract}</p>}
                  <div className="result-metadata">
                    {record.publicationDate && <span>{record.publicationDate.split("T")[0]}</span>}
                    {record.center && <span>{record.center}</span>}
                    {record.authors.length > 0 && <span>{record.authors.join("; ")}</span>}
                  </div>
                  <div className="result-source-line"><span>NASA NTRS ID {record.id}</span><Link href={`/research/${encodeURIComponent(record.id)}`}>View record details <ArrowRight size={13} aria-hidden="true" /></Link><SavedPaperButton nasaId={record.id} accountState={saveAccess} initialSaved={savedIds.has(record.id)} returnTo={`/research/${encodeURIComponent(record.id)}`} /></div>
                </div>
                <a className="source-link" href={record.canonicalUrl} target="_blank" rel="noreferrer" aria-label={`Open ${record.title} on NASA NTRS`}><ArrowUpRight size={17} aria-hidden="true" /></a>
              </article>
            ))}
            {!loading && !error && data?.results.length === 0 && (
              <div className="empty-search-state">
                <span className="empty-state-mark" aria-hidden="true"><Search size={20} /></span>
                <div><h4>No NASA records match this search</h4><p>Try a broader term or clear source filters. No matching record does not mean there is no evidence.</p></div>
                {(stiType || center || subjectCategory) && <button type="button" className="quiet-button" onClick={clearFilters}>Clear filters</button>}
              </div>
            )}
          </div>
          {variant === "explorer" && !loading && !error && data && data.results.length > 0 && (
            <div className="research-pagination" aria-label="Research results pages">
              <button className="quiet-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous results page"><ArrowLeft size={15} aria-hidden="true" /> Previous</button>
              <span>Page {page.toLocaleString()} of {lastPage.toLocaleString()}</span>
              <button className="quiet-button" type="button" onClick={() => setPage((value) => Math.min(lastPage, value + 1))} disabled={page >= lastPage} aria-label="Next results page">Next <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          )}
          {!loading && !error && data?.partial && <p className="search-notice" role="status">NASA NTRS returned some records with incomplete metadata. Unavailable fields are left blank.</p>}
          {!loading && !error && data && data.total > 10_000 && <p className="search-notice">NASA NTRS allows paging through the first 10,000 records for a single search.</p>}
        </section>
      </div>
    </section>
  );
}
