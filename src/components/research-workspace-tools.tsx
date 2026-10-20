"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Download, LoaderCircle, RotateCcw, Search, Send, X } from "lucide-react";
import type { NtrsRecord, NtrsSearchResult } from "@/lib/ntrs-provider-core";
import type { AssistantClaim, AssistantResult, AssistantSource } from "@/lib/ai-research-assistant-core";
import { countByLabel, createScenarioAssumptionRecord, getMetadataCoverage, publicationYear, type ScenarioAssumptions } from "@/lib/research-workspace-core";

type ErrorPayload = { error?: { message?: string } };

async function searchNtrs(query: string, pageSize: number): Promise<NtrsSearchResult> {
  const params = new URLSearchParams({ q: query.trim(), page: "1", pageSize: String(pageSize) });
  const response = await fetch(`/api/research?${params.toString()}`, { headers: { accept: "application/json" } });
  const payload = await response.json() as NtrsSearchResult & ErrorPayload;
  if (!response.ok) throw new Error(payload.error?.message ?? "NASA NTRS search could not be completed.");
  return payload;
}

function QueryForm({ query, setQuery, onSubmit, loading, buttonLabel = "Search NASA NTRS" }: {
  query: string;
  setQuery: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  buttonLabel?: string;
}) {
  return (
    <form className="tool-search-form" role="search" onSubmit={onSubmit}>
      <label htmlFor="workspace-tool-query">Research query</label>
      <div className="tool-search-control">
        <Search size={19} aria-hidden="true" />
        <input id="workspace-tool-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={300} required placeholder="Search microgravity combustion research" />
        <button className="button button-primary" type="submit" disabled={loading || !query.trim()}>{loading ? "Searching…" : buttonLabel}</button>
      </div>
      <small>Search is limited to records returned by NASA NTRS for this query.</small>
    </form>
  );
}

function ProviderError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="tool-error" role="alert"><X size={17} aria-hidden="true" /><div><strong>NASA NTRS could not complete this search</strong><p>{message}</p>{onRetry && <button className="quiet-button" type="button" onClick={onRetry}>Try again</button>}</div></div>;
}

function RecordMetadata({ record }: { record: NtrsRecord }) {
  const details = [record.documentType, record.publicationDate?.split("T")[0], record.center].filter(Boolean);
  return (
    <div className="tool-record-meta">
      <span>NASA NTRS ID {record.id}</span>
      {details.map((value, index) => <span key={`${index}-${value}`}>{value}</span>)}
      {record.doi && <span>DOI {record.doi}</span>}
    </div>
  );
}

type AssistantTurn = { id: string; question: string; result: AssistantResult };
type AssistantErrorPayload = { code: string; message: string };
type AssistantStreamEvent =
  | { type: "status"; stage: "retrieval" | "synthesis"; queries?: string[] }
  | { type: "result"; data: AssistantResult }
  | { type: "error"; error: AssistantErrorPayload };

class AssistantRequestError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

function CitationLinks({ citations, sources }: { citations: string[]; sources: AssistantSource[] }) {
  const byLabel = new Map(sources.map((source) => [source.label, source]));
  return <span className="assistant-citations" aria-label="Cited NASA sources">{citations.map((label) => {
    const source = byLabel.get(label);
    return source ? <a key={label} href={source.record.canonicalUrl} target="_blank" rel="noreferrer" aria-label={`Source ${label}: ${source.record.title} on NASA NTRS`}>[{label}]</a> : null;
  })}</span>;
}

function AssistantClaimList({ claims, sources, emptyLabel }: { claims: AssistantClaim[]; sources: AssistantSource[]; emptyLabel: string }) {
  if (claims.length === 0) return <p className="assistant-answer-empty">{emptyLabel}</p>;
  return <ul className="assistant-claim-list">{claims.map((claim, index) => <li key={`${index}-${claim.text}`}>
    <p>{claim.text}<CitationLinks citations={claim.citations} sources={sources} /></p>
  </li>)}</ul>;
}

function AssistantSourceCard({ source }: { source: AssistantSource }) {
  const { record } = source;
  const metadata = [
    record.documentType,
    record.publicationDate?.split("T")[0],
    record.center,
    record.doi ? `DOI ${record.doi}` : undefined,
  ].filter((value): value is string => !!value);

  return <li className="assistant-source-card">
    <div className="assistant-source-topline"><a href={record.canonicalUrl} target="_blank" rel="noreferrer" className="assistant-source-citation">[{source.label}] · NASA NTRS {record.id} <ArrowUpRight size={13} aria-hidden="true" /></a><span className={`assistant-source-role${source.role === "follow-up context" ? " is-context" : ""}`}>{source.role}</span></div>
    <h4><Link href={`/research/${encodeURIComponent(record.id)}`}>{record.title}</Link></h4>
    {record.authors.length > 0 && <p className="assistant-source-authors">{record.authors.join("; ")}</p>}
    {metadata.length > 0 && <p className="assistant-source-meta">{metadata.join(" · ")}</p>}
    {record.abstract ? <details className="assistant-source-abstract"><summary>Read source abstract</summary><p>{record.abstract}</p></details> : <p className="assistant-source-missing">NASA NTRS did not provide an abstract for this record.</p>}
    {record.fullTextLinks.length > 0 && <div className="assistant-full-text-links">{record.fullTextLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} <ArrowUpRight size={12} aria-hidden="true" /></a>)}</div>}
  </li>;
}

function errorHeading(code: string) {
  if (code.startsWith("ntrs_")) return "NASA research retrieval failed";
  if (code === "quota") return "AI service quota reached";
  if (code === "timeout") return "AI synthesis timed out";
  if (code === "not_configured" || code === "invalid_model") return "AI synthesis is unavailable";
  if (code === "unauthorized") return "Sign in to use the research assistant";
  return "The research assistant could not complete this question";
}

const exampleQuestions = [
  "What do NASA NTRS abstracts say about flame shape in microgravity?",
  "Which retrieved records discuss flame spread or spacecraft fire safety?",
  "What source abstracts address ignition or extinction in reduced gravity?",
];

export function AiResearchAssistantWorkspace({ synthesisAvailable = true }: { synthesisAvailable?: boolean }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [stage, setStage] = useState<"retrieval" | "synthesis" | null>(null);
  const [activeQueries, setActiveQueries] = useState<string[]>([]);
  const [error, setError] = useState<AssistantErrorPayload | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const busy = stage !== null;

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedQuestion = question.trim();
    if (!submittedQuestion || submittedQuestion.length > 500 || busy) return;

    const history = turns.slice(-3).map((turn) => ({
      question: turn.question,
      sourceIds: turn.result.sources.slice(0, 3).map(({ record }) => record.id),
    }));
    setStage("retrieval");
    setActiveQueries([]);
    setError(null);
    let result: AssistantResult | null = null;
    const requestStartedAt = performance.now();
    let requestId: string | null = null;

    try {
      const response = await fetch("/api/research/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: submittedQuestion, history }),
      });
      requestId = response.headers.get("x-request-id");
      if (!response.ok) {
        let message = "The research assistant could not complete this request. Please try again.";
        let code = "assistant_unavailable";
        try {
          const payload = await response.json() as { error?: AssistantErrorPayload };
          if (payload.error?.message) message = payload.error.message;
          if (payload.error?.code) code = payload.error.code;
        } catch { /* Keep the generic response for malformed errors. */ }
        throw new AssistantRequestError(code, message);
      }
      if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body) {
        throw new AssistantRequestError("assistant_unavailable", "The research assistant returned an invalid response. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: AssistantRequestError | null = null;
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buffer += decoder.decode(chunk.value, { stream: !done });
        let frameEnd = buffer.indexOf("\n\n");
        while (frameEnd >= 0) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
          if (dataLine) {
            const payload = JSON.parse(dataLine.slice(5).trim()) as AssistantStreamEvent;
            if (payload.type === "status") {
              setStage(payload.stage);
              if (payload.stage === "retrieval") setActiveQueries(payload.queries ?? []);
            }
            else if (payload.type === "result") result = payload.data;
            else if (payload.type === "error") streamError = new AssistantRequestError(payload.error.code, payload.error.message);
          }
          frameEnd = buffer.indexOf("\n\n");
        }
      }
      if (streamError) throw streamError;
      if (!result) throw new AssistantRequestError("assistant_unavailable", "The research assistant closed before returning a complete answer. Please try again.");
      const claims = [...result.answer.findings, ...result.answer.uncertainties, ...(result.answer.interpretation ? [result.answer.interpretation] : [])];
      const validCitationLabels = new Set(result.sources.map(({ label }) => label));
      const generatedClaims = claims.filter(({ text }) => !!text.trim());
      const citationValidationResult = generatedClaims.length === 0
        ? "not_applicable"
        : generatedClaims.every(({ citations }) => citations.length > 0 && citations.every((label) => validCitationLabels.has(label)))
          ? "passed"
          : "failed";
      console.info(JSON.stringify({
        event: "assistant_client_delivery",
        requestId,
        elapsedTimeMs: Math.round(performance.now() - requestStartedAt),
        outcome: "result_received",
        resultStatus: result.status,
        sourceCount: result.sources.length,
        generatedAnswerNonEmpty: generatedClaims.length > 0,
        citationValidationResult,
      }));
      setTurns((previous) => [...previous, { id: `${Date.now()}-${previous.length}`, question: submittedQuestion, result: result as AssistantResult }]);
      setQuestion("");
    } catch (cause) {
      const code = cause instanceof AssistantRequestError ? cause.code : "assistant_unavailable";
      const message = cause instanceof AssistantRequestError ? cause.message : "The research assistant could not connect or returned an invalid response. Please try again.";
      console.info(JSON.stringify({
        event: "assistant_client_delivery",
        requestId,
        elapsedTimeMs: Math.round(performance.now() - requestStartedAt),
        outcome: "error",
        errorCode: code,
      }));
      setError({ code, message });
    } finally {
      setStage(null);
    }
  }

  function beginNewQuestion() {
    setTurns([]);
    setQuestion("");
    setError(null);
    composerRef.current?.focus();
  }

  return (
    <div className="workspace-tool-page assistant-workspace">
      {!synthesisAvailable && <section className="assistant-unavailable" aria-labelledby="assistant-unavailable-title">
        <span className="tool-semantic-marker" aria-hidden="true" />
        <div><p className="semantic-label">NASA RETRIEVAL · AI INTERPRETATION</p><h2 id="assistant-unavailable-title">Gemini synthesis is not connected</h2><p>Questions can still retrieve real NASA NTRS records here with a deterministic search plan. No generated findings or scientific conclusions will be shown until Gemini is configured.</p></div>
      </section>}

      <section className="tool-panel assistant-composer-panel" aria-labelledby="assistant-composer-title">
        <div className="tool-panel-heading"><div><p className="eyebrow">NASA NTRS · SOURCE-GROUNDED</p><h2 id="assistant-composer-title">Ask a research question</h2><p>Each response starts with live NASA NTRS retrieval. The assistant uses the returned metadata and abstracts, and links every cited source to its NASA record.</p></div><span className="workspace-scope"><span aria-hidden="true" />{synthesisAvailable ? "LIVE RESEARCH" : "SYNTHESIS UNAVAILABLE"}</span></div>

        <div className="assistant-example-questions" aria-label="Example research questions">
          <span>Try a question</span>
          {exampleQuestions.map((example) => <button key={example} type="button" className="assistant-example-button" onClick={() => { setQuestion(example); composerRef.current?.focus(); }} disabled={busy}>{example}</button>)}
        </div>

        <form className="assistant-composer" onSubmit={(event) => void ask(event)}>
          <label htmlFor="assistant-question">Research question</label>
          <textarea ref={composerRef} id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={3} required disabled={busy} placeholder="Ask about microgravity combustion, flame spread, ignition, extinction, or spacecraft fire safety…" />
          <div className="assistant-composer-footer"><small>Up to 500 characters. The full question is kept for synthesis; concise NASA queries are generated deterministically.</small><button className="button button-primary" type="submit" disabled={busy || !question.trim()}>{busy ? <><LoaderCircle size={16} aria-hidden="true" className="assistant-spinner" /> Working…</> : <><Send size={15} aria-hidden="true" /> Ask the assistant</>}</button></div>
        </form>
        {error && <div className="tool-error assistant-error" role="alert"><X size={17} aria-hidden="true" /><div><strong>{errorHeading(error.code)}</strong><p>{error.message}</p></div></div>}
      </section>

      {busy && <section className="assistant-progress" role="status" aria-live="polite" aria-busy="true">
        <span className="tool-semantic-marker" aria-hidden="true" />
        <div className="assistant-progress-copy"><span className="assistant-progress-kicker">{stage === "retrieval" ? "SOURCE RETRIEVAL" : "AI INTERPRETATION"}</span><h2>{stage === "retrieval" ? "Retrieving NASA research" : "Synthesizing the retrieved evidence"}</h2><p>{stage === "retrieval" ? "Searching NASA NTRS with deterministic queries based on your full question…" : "Sending retrieved NASA metadata and abstracts for synthesis…"}</p>{stage === "retrieval" && activeQueries.length > 0 && <ul className="assistant-active-queries">{activeQueries.map((query) => <li key={query}>{query}</li>)}</ul>}<div className="assistant-skeleton" aria-hidden="true"><span /><span /><span /></div></div>
      </section>}

      {turns.length > 0 && <div className="assistant-conversation-heading"><div><p className="eyebrow">RESEARCH THREAD</p><h2>Questions and source-grounded answers</h2><p>Each answer retains its own NASA records and clickable citations.</p></div><button className="button button-secondary assistant-new-question" type="button" onClick={beginNewQuestion} disabled={busy}><RotateCcw size={15} aria-hidden="true" /> Start a new question</button></div>}

      {turns.map((turn, index) => <article key={turn.id} className="assistant-turn" aria-labelledby={`assistant-question-${turn.id}`}>
        <header className="assistant-user-question"><span>QUESTION {String(index + 1).padStart(2, "0")}</span><h2 id={`assistant-question-${turn.id}`}>{turn.question}</h2></header>
        <p className="assistant-search-summary" role="status">NASA NTRS returned {turn.result.search.uniqueRecordCount} unique source record{turn.result.search.uniqueRecordCount === 1 ? "" : "s"} across {turn.result.search.queries.filter(({ status }) => status === "returned").length} successful quer{turn.result.search.queries.filter(({ status }) => status === "returned").length === 1 ? "y" : "ies"}; {turn.result.search.selectedRecordCount} current record{turn.result.search.selectedRecordCount === 1 ? " was" : "s were"} selected for synthesis{turn.result.unavailableContextSourceCount > 0 ? `. ${turn.result.unavailableContextSourceCount} prior source record${turn.result.unavailableContextSourceCount === 1 ? " was" : "s were"} unavailable for refresh.` : "."}</p>

        <details className="assistant-search-strategy">
          <summary>Search strategy · {turn.result.search.queries.length} deterministic NASA queries</summary>
          <ul>{turn.result.search.queries.map((entry) => <li key={entry.query}><span>{entry.query}</span><small>{entry.status === "failed" ? "NASA search unavailable" : `${entry.recordsReturned ?? 0} records returned`}</small></li>)}</ul>
          {turn.result.search.queries.some(({ status }) => status === "failed") && <p>Some NASA query requests failed. Counts above show the records returned for successful requests only.</p>}
        </details>

        {turn.result.evidenceNotice && <div className={`assistant-insufficient-notice${turn.result.status === "retrieved_only" ? " is-synthesis-unavailable" : ""}`} role="status"><strong>{turn.result.status === "retrieved_only" ? "NASA records retrieved · AI synthesis unavailable" : "Insufficient source evidence"}</strong><p>{turn.result.evidenceNotice}</p></div>}

        <div className="assistant-answer-grid">
          <section className="assistant-answer-section published" aria-labelledby={`assistant-evidence-${turn.id}`}>
            <p className="semantic-label">PUBLISHED EVIDENCE</p><h3 id={`assistant-evidence-${turn.id}`}>What the retrieved records support</h3>
            <AssistantClaimList claims={turn.result.answer.findings} sources={turn.result.sources} emptyLabel="No specific finding was asserted from the available source abstracts." />
          </section>
          <section className="assistant-answer-section interpreted" aria-labelledby={`assistant-interpretation-${turn.id}`}>
            <p className="semantic-label">AI INTERPRETATION</p><h3 id={`assistant-interpretation-${turn.id}`}>Synthesis across sources</h3>
            {turn.result.answer.interpretation ? <p className="assistant-interpretation-copy">{turn.result.answer.interpretation.text}<CitationLinks citations={turn.result.answer.interpretation.citations} sources={turn.result.sources} /></p> : <p className="assistant-answer-empty">{turn.result.status === "retrieved_only" ? "No AI interpretation was generated. Review the NASA source abstracts below." : "No broader interpretation was generated beyond the available evidence."}</p>}
            <small>AI-generated synthesis; it is not a published NASA finding.</small>
          </section>
        </div>

        {turn.result.answer.uncertainties.length > 0 && <section className="assistant-uncertainty" aria-labelledby={`assistant-uncertainty-${turn.id}`}><h3 id={`assistant-uncertainty-${turn.id}`}>Evidence limits and uncertainty</h3><AssistantClaimList claims={turn.result.answer.uncertainties} sources={turn.result.sources} emptyLabel="" /></section>}

        {turn.result.sources.length > 0 ? <section className="assistant-sources" aria-labelledby={`assistant-sources-${turn.id}`}><div className="assistant-sources-heading"><div><p className="eyebrow">TRACEABLE SOURCE RECORDS</p><h3 id={`assistant-sources-${turn.id}`}>NASA NTRS records used</h3></div><span>{turn.result.sources.length} linked source{turn.result.sources.length === 1 ? "" : "s"} · {turn.result.search.uniqueRecordCount} unique returned</span></div><ul className="assistant-source-list">{turn.result.sources.map((source) => <AssistantSourceCard key={`${turn.id}-${source.record.id}`} source={source} />)}</ul></section> : <div className="tool-empty-state assistant-no-sources"><h3>No source records were returned</h3><p>Try a broader or more focused scientific term. This bounded NASA search does not show that evidence is absent from the broader literature.</p></div>}
        <p className="assistant-provenance-note">Source material is limited to the NASA NTRS metadata and abstracts shown above. A record’s abstract may not describe every method or result in its full text.</p>
      </article>)}
    </div>
  );
}

export function ExperimentComparisonWorkspace() {
  const [query, setQuery] = useState("microgravity combustion");
  const [result, setResult] = useState<NtrsSearchResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || query.trim().length > 300) return;
    setLoading(true); setError(""); setResult(null); setSelected([]);
    try { setResult(await searchNtrs(query, 20)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "NASA NTRS search could not be completed."); }
    finally { setLoading(false); }
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((entry) => entry !== id) : current.length < 3 ? [...current, id] : current);
  }

  const selectedRecords = (result?.results ?? []).filter((record) => selected.includes(record.id));
  const rows: Array<{ label: string; value: (record: NtrsRecord) => string | undefined }> = [
    { label: "NASA NTRS identifier", value: (record) => record.id },
    { label: "Document type", value: (record) => record.documentType },
    { label: "Publication date", value: (record) => record.publicationDate?.split("T")[0] },
    { label: "NASA center", value: (record) => record.center },
    { label: "Authors", value: (record) => record.authors.length ? record.authors.join("; ") : undefined },
    { label: "DOI", value: (record) => record.doi },
    { label: "Subject categories", value: (record) => record.subjectCategories.length ? record.subjectCategories.join("; ") : undefined },
  ];

  return (
    <div className="workspace-tool-page">
      <section className="tool-panel" aria-labelledby="comparison-search-title">
        <div className="tool-panel-heading"><div><p className="eyebrow">SOURCE RECORDS</p><h2 id="comparison-search-title">Choose records to compare</h2><p>Select up to three NASA NTRS records. This comparison uses provider metadata and abstracts only.</p></div><span className="workspace-scope"><span aria-hidden="true" /> SOURCE-LINKED</span></div>
        <QueryForm query={query} setQuery={setQuery} onSubmit={submit} loading={loading} buttonLabel="Find records" />
        {loading && <p className="tool-loading" role="status">Searching NASA NTRS…</p>}
        {error && <ProviderError message={error} />}
        {result && <>
          <p className="tool-result-scope" role="status">{result.totalIsEstimate ? "About " : ""}{result.total.toLocaleString()} records match “{result.query}”; select up to three from the {result.results.length} returned here.</p>
          {result.results.length ? <ul className="comparison-record-select">{result.results.map((record) => <li key={record.id}>
            <label><input type="checkbox" checked={selected.includes(record.id)} disabled={!selected.includes(record.id) && selected.length >= 3} onChange={() => toggle(record.id)} /><span className="comparison-record-copy"><strong>{record.title}</strong><small>NASA NTRS ID {record.id}{record.documentType ? ` · ${record.documentType}` : ""}{record.publicationDate ? ` · ${record.publicationDate.split("T")[0]}` : ""}</small></span><Link href={`/research/${encodeURIComponent(record.id)}`}>Details</Link></label>
          </li>)}</ul> : <div className="tool-empty-state"><h3>No records returned</h3><p>Try a broader search term. An empty query result is not evidence that no study exists.</p></div>}
        </>}
      </section>
      {selectedRecords.length > 0 && <section className="tool-panel comparison-output" aria-labelledby="comparison-output-title">
        <div className="tool-panel-heading"><div><p className="eyebrow">AVAILABLE METADATA</p><h2 id="comparison-output-title">Record comparison</h2><p>Missing fields mean NASA NTRS did not return that metadata for this record. They are not zero values.</p></div><button className="quiet-button" type="button" onClick={() => setSelected([])}>Clear selection</button></div>
        <div className="comparison-table-wrap" role="region" aria-label="Selected NASA record metadata comparison" tabIndex={0}>
          <table className="comparison-table"><thead><tr><th scope="col">Field</th>{selectedRecords.map((record) => <th scope="col" key={record.id}>{record.title}<small>NASA NTRS {record.id}</small><a href={record.canonicalUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={12} aria-hidden="true" /></a></th>)}</tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{selectedRecords.map((record) => <td key={record.id}>{row.value(record) || <span className="not-provided">Not provided by source</span>}</td>)}</tr>)}
              <tr><th scope="row">Published abstract</th>{selectedRecords.map((record) => <td key={record.id}>{record.abstract || <span className="not-provided">Not provided by source</span>}</td>)}</tr>
              <tr><th scope="row">Full text</th>{selectedRecords.map((record) => <td key={record.id}>{record.fullTextLinks.length ? record.fullTextLinks.map((link) => <a className="table-source-link" href={link.url} target="_blank" rel="noreferrer" key={link.url}>{link.label} <ArrowUpRight size={12} aria-hidden="true" /></a>) : <span className="not-provided">No full-text link returned</span>}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="tool-disclaimer">NASA NTRS does not provide structured experimental measurements through the metadata used here. No flame properties, outcomes, or experimental values are inferred.</p>
      </section>}
    </div>
  );
}

const emptyScenario: ScenarioAssumptions = {
  gravityContext: "",
  fuelDescription: "",
  oxidizerDescription: "",
  ambientPressureKpa: "",
  initialTemperatureK: "",
  oxygenVolumePercent: "",
  durationSeconds: "",
};

export function ScenarioExplorerWorkspace() {
  const [assumptions, setAssumptions] = useState(emptyScenario);
  const update = (key: keyof ScenarioAssumptions, value: string) => setAssumptions((current) => ({ ...current, [key]: value }));
  const snapshot = createScenarioAssumptionRecord(assumptions);

  function download() {
    const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "flame-in-freefall-scenario-assumptions.json";
    anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="workspace-tool-page">
      <div className="scenario-limit-note" role="note"><p className="eyebrow">ASSUMPTIONS ONLY · NO SOLVER</p><p>This is an interactive scenario worksheet. It records values you choose; it does not calculate combustion behavior, predict flame outcomes, or represent a validated NASA simulation.</p></div>
      <div className="scenario-layout">
        <section className="tool-panel" aria-labelledby="scenario-input-title">
          <div className="tool-panel-heading"><div><p className="eyebrow">USER-SELECTED CONDITIONS</p><h2 id="scenario-input-title">Define a scenario</h2><p>Every value below is a user assumption. Leave unknown values blank.</p></div></div>
          <form className="scenario-form" onSubmit={(event) => event.preventDefault()}>
            <label>Gravity context<select value={assumptions.gravityContext} onChange={(event) => update("gravityContext", event.target.value)}><option value="">Choose a context</option><option>Microgravity (user-selected context)</option><option>Partial gravity (user-selected context)</option><option>Earth gravity (user-selected context)</option><option>Other or unspecified</option></select></label>
            <label>Fuel or material description<input value={assumptions.fuelDescription} onChange={(event) => update("fuelDescription", event.target.value)} maxLength={200} placeholder="Enter a material or fuel" /></label>
            <label>Oxidizer description<input value={assumptions.oxidizerDescription} onChange={(event) => update("oxidizerDescription", event.target.value)} maxLength={200} placeholder="Enter an oxidizer or mixture" /></label>
            <label>Ambient pressure <span>(kPa; optional)</span><input type="number" min="0" step="any" value={assumptions.ambientPressureKpa} onChange={(event) => update("ambientPressureKpa", event.target.value)} inputMode="decimal" /></label>
            <label>Initial temperature <span>(K; optional)</span><input type="number" min="0" step="any" value={assumptions.initialTemperatureK} onChange={(event) => update("initialTemperatureK", event.target.value)} inputMode="decimal" /></label>
            <label>Oxygen concentration <span>(vol %; optional)</span><input type="number" min="0" max="100" step="any" value={assumptions.oxygenVolumePercent} onChange={(event) => update("oxygenVolumePercent", event.target.value)} inputMode="decimal" /></label>
            <label>Planned duration <span>(s; optional)</span><input type="number" min="0" step="any" value={assumptions.durationSeconds} onChange={(event) => update("durationSeconds", event.target.value)} inputMode="decimal" /></label>
          </form>
        </section>
        <section className="tool-panel scenario-preview" aria-labelledby="scenario-preview-title" aria-live="polite">
          <div className="tool-panel-heading"><div><p className="eyebrow">SCENARIO RECORD</p><h2 id="scenario-preview-title">Your assumptions</h2></div><span className="workspace-scope">USER INPUT</span></div>
          {snapshot.parameters.length ? <dl className="scenario-parameter-list">{snapshot.parameters.map((parameter) => <div key={parameter.name}><dt>{parameter.name}</dt><dd>{parameter.value}{parameter.unit ? ` ${parameter.unit}` : ""}</dd></div>)}</dl> : <div className="tool-empty-state"><h3>No conditions entered</h3><p>Choose a context or add a parameter to build a scenario record.</p></div>}
          <p className="scenario-origin"><Check size={15} aria-hidden="true" /> Values are recorded as user-entered assumptions, not published evidence.</p>
          <p className="tool-disclaimer">{snapshot.limitation} Do not use this worksheet as an engineering prediction or fire-safety decision tool.</p>
          <button className="button button-secondary" type="button" onClick={download} disabled={!snapshot.parameters.length}><Download size={15} aria-hidden="true" /> Download assumptions JSON</button>
        </section>
      </div>
    </div>
  );
}

function MetadataCoverageTable({ records }: { records: NtrsRecord[] }) {
  const coverage = getMetadataCoverage(records);
  return (
    <div className="coverage-table-wrap"><table className="coverage-table"><thead><tr><th scope="col">Metadata field</th><th scope="col">Returned</th><th scope="col">Not returned</th></tr></thead><tbody>{coverage.fields.map((field) => <tr key={field.key}><th scope="row">{field.label}</th><td>{field.available} / {coverage.total}</td><td>{field.missing} / {coverage.total}</td></tr>)}</tbody></table>
      <p className="tool-disclaimer">This coverage summary describes only these {coverage.total} returned records. It does not measure all published research or prove that an unreturned field is absent from a paper.</p></div>
  );
}

function MetadataBars({ title, rows, sampleSize }: { title: string; rows: Array<{ label: string; count: number }>; sampleSize: number }) {
  if (!rows.length) return <div className="tool-empty-state"><h3>No structured values are available</h3><p>NASA NTRS did not return records for this breakdown in the inspected page.</p></div>;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return <figure className="metadata-chart"><figcaption><h3>{title}</h3><p>Counts among {sampleSize} records returned for the current query.</p></figcaption><ol>{rows.map((row) => <li key={row.label}><span className="metadata-chart-label">{row.label}</span><span className="metadata-bar-track" aria-hidden="true"><span style={{ width: `${(row.count / max) * 100}%` }} /></span><span className="metadata-chart-count">{row.count}</span></li>)}</ol><table className="sr-only"><caption>{title} data</caption><thead><tr><th scope="col">Category</th><th scope="col">Record count</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.count}</td></tr>)}</tbody></table></figure>;
}

export function ResearchCorpusWorkspace({ mode }: { mode: "gaps" | "analytics" }) {
  const [query, setQuery] = useState(mode === "gaps" ? "microgravity combustion" : "microgravity combustion");
  const [result, setResult] = useState<NtrsSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageSize = mode === "gaps" ? 50 : 100;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || query.trim().length > 300) return;
    setLoading(true); setError(""); setResult(null);
    try { setResult(await searchNtrs(query, pageSize)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "NASA NTRS search could not be completed."); }
    finally { setLoading(false); }
  }

  const records = result?.results ?? [];
  const types = countByLabel(records.map((record) => record.documentType));
  const years = countByLabel(records.map((record) => publicationYear(record.publicationDate)));

  return (
    <div className="workspace-tool-page">
      <section className="tool-panel" aria-labelledby={`${mode}-query-heading`}>
        <div className="tool-panel-heading"><div><p className="eyebrow">LIVE CORPUS QUERY</p><h2 id={`${mode}-query-heading`}>{mode === "gaps" ? "Inspect metadata coverage" : "Analyze returned record metadata"}</h2><p>{mode === "gaps" ? "Check which metadata fields NASA returned for a bounded search sample. This is not a literature review." : "View publication metadata distributions from one reproducible NTRS query. No experimental measurements are inferred."}</p></div><span className="workspace-scope"><span aria-hidden="true" /> NASA NTRS</span></div>
        <QueryForm query={query} setQuery={setQuery} onSubmit={submit} loading={loading} buttonLabel={mode === "gaps" ? "Inspect coverage" : "Run metadata analysis"} />
        {loading && <p className="tool-loading" role="status">Searching NASA NTRS…</p>}
        {error && <ProviderError message={error} />}
        {result && <p className="tool-result-scope" role="status">NASA NTRS returned {result.totalIsEstimate ? "about " : ""}{result.total.toLocaleString()} records for “{result.query}”. This view inspected {records.length} records from one result page{result.partial ? "; some records had incomplete metadata" : ""}.</p>}
        {result && records.length === 0 && <div className="tool-empty-state"><h3>No records were returned for this query</h3><p>An empty NTRS search does not establish that no relevant evidence exists. Broaden or revise the query, then inspect the returned scope.</p></div>}
      </section>
      {result && records.length > 0 && mode === "gaps" && <>
        <section className="tool-panel" aria-labelledby="coverage-heading"><div className="tool-panel-heading"><div><p className="eyebrow">OBSERVED RESPONSE FIELDS</p><h2 id="coverage-heading">Metadata availability in this sample</h2></div><span className="coverage-sample-count">n = {records.length}</span></div><MetadataCoverageTable records={records} /></section>
        <section className="tool-panel" aria-labelledby="coverage-records-heading"><div className="tool-panel-heading"><div><p className="eyebrow">SOURCE SCOPE</p><h2 id="coverage-records-heading">Records inspected</h2><p>Open a NASA source record to review the publication itself.</p></div></div><ul className="tool-record-list coverage-record-list">{records.slice(0, 12).map((record) => <li key={record.id}><div><p className="result-source-line"><span>NASA NTRS ID {record.id}</span>{record.publicationDate && <span>{record.publicationDate.split("T")[0]}</span>}</p><h3><Link href={`/research/${encodeURIComponent(record.id)}`}>{record.title}</Link></h3><RecordMetadata record={record} /></div><a className="source-link" href={record.canonicalUrl} target="_blank" rel="noreferrer" aria-label={`Open ${record.title} on NASA NTRS`}><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul></section>
      </>}
      {result && records.length > 0 && mode === "analytics" && <>
        <section className="tool-panel" aria-labelledby="analytics-coverage-heading"><div className="tool-panel-heading"><div><p className="eyebrow">DATA LIMITS</p><h2 id="analytics-coverage-heading">Metadata coverage</h2><p>Counts below use the records returned in the inspected page, not the full reported result total.</p></div><span className="coverage-sample-count">n = {records.length}</span></div><MetadataCoverageTable records={records} /></section>
        <div className="analytics-chart-grid"><section className="tool-panel"><MetadataBars title="Document type" rows={types} sampleSize={records.length} /></section><section className="tool-panel"><MetadataBars title="Publication year" rows={years} sampleSize={records.length} /></section></div>
        <p className="tool-disclaimer analytics-disclaimer">These summaries describe NTRS record metadata for the query shown. The available metadata does not include a structured, comparable set of experimental measurements, so no scientific outcome chart is produced.</p>
      </>}
    </div>
  );
}

