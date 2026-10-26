import type { NtrsRecord, NtrsSearchInput, NtrsSearchResult } from "@/lib/ntrs-provider-core";

export const MAX_ASSISTANT_REQUEST_BYTES = 12_000;
export const MAX_ASSISTANT_QUESTION_LENGTH = 500;
export const MAX_ASSISTANT_HISTORY_TURNS = 3;
export const MAX_ASSISTANT_CONTEXT_IDS = 3;
export const MAX_ASSISTANT_CURRENT_SOURCES = 8;
export const MAX_ASSISTANT_SOURCES = MAX_ASSISTANT_CURRENT_SOURCES + MAX_ASSISTANT_CONTEXT_IDS;
export const MAX_ASSISTANT_SEARCH_QUERIES = 4;
export const MIN_ASSISTANT_SEARCH_QUERIES = 2;
export const MAX_ASSISTANT_SEARCH_QUERY_LENGTH = 120;

const NTRS_QUERY_STOP_WORDS = new Set([
  "a", "about", "abstract", "abstracts", "across", "affect", "an", "and", "are", "at", "available", "be", "by", "can", "cite", "compared", "could", "describe", "describes", "did", "different", "differently", "distinguish", "do", "does", "established", "explain", "for", "formation", "from", "how", "i", "in", "into", "is", "it", "me", "my", "nasa", "normal", "ntrs", "of", "on", "or", "original", "our", "please", "record", "records", "report", "reports", "research", "say", "says", "show", "shows", "summarize", "that", "the", "their", "this", "to", "under", "uncertainty", "we", "what", "when", "where", "which", "who", "why", "with", "would", "you", "your",
]);

export type AssistantHistoryTurn = { question: string; sourceIds: string[] };
export type AssistantRequest = { question: string; history: AssistantHistoryTurn[] };
export type AssistantClaim = { text: string; citations: string[] };
export type AssistantAnswer = {
  sufficientEvidence: boolean;
  findings: AssistantClaim[];
  interpretation: AssistantClaim | null;
  uncertainties: AssistantClaim[];
};
export type AssistantSource = { label: string; role: "current question" | "follow-up context"; record: NtrsRecord };
export type AssistantResult = {
  status: "answered" | "insufficient_evidence" | "retrieved_only";
  question: string;
  search: {
    queries: Array<{ query: string; status: "returned" | "failed"; recordsReturned: number | null }>;
    planningSource: "gemini" | "deterministic";
    uniqueRecordCount: number;
    selectedRecordCount: number;
  };
  sources: AssistantSource[];
  unavailableContextSourceCount: number;
  answer: AssistantAnswer;
  evidenceNotice: string | null;
  synthesisError: { code: string; message: string } | null;
};

export type AssistantServiceErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "request_too_large"
  | "not_configured"
  | "invalid_model"
  | "invalid_model_response"
  | "invalid_citation";

export class AssistantServiceError extends Error {
  readonly code: AssistantServiceErrorCode;
  readonly diagnosticCode?: string;

  constructor(code: AssistantServiceErrorCode, message: string, diagnosticCode?: string) {
    super(message);
    this.name = "AssistantServiceError";
    this.code = code;
    this.diagnosticCode = diagnosticCode;
  }
}

export type AssistantDiagnosticEvent = {
  stage: "query_planning" | "nasa_retrieval" | "source_selection" | "response_parsing" | "citation_validation" | "response_validation" | "assistant_result";
  elapsedTimeMs: number;
  outcome: string;
  retrievalKind?: "search" | "context";
  queryIndex?: number;
  recordsReturned?: number | null;
  uniqueRecordCount?: number;
  sourceCount?: number;
  code?: string;
};

export async function readBoundedJsonBody(request: Request, maxBytes = MAX_ASSISTANT_REQUEST_BYTES): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw new AssistantServiceError("invalid_json", "Send a valid JSON request.");
    if (Number(contentLength) > maxBytes) throw new AssistantServiceError("request_too_large", "This research question is larger than the supported request limit.");
  }

  if (!request.body) throw new AssistantServiceError("invalid_json", "Send a valid JSON request.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new AssistantServiceError("request_too_large", "This research question is larger than the supported request limit.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof AssistantServiceError) throw error;
    throw new AssistantServiceError("invalid_json", "Send a valid JSON request.");
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
  } catch {
    throw new AssistantServiceError("invalid_json", "Send a valid JSON request.");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeQuestion(value: unknown): string {
  if (typeof value !== "string") throw new AssistantServiceError("invalid_request", "Enter a research question.");
  const question = value.trim();
  if (!question) throw new AssistantServiceError("invalid_request", "Enter a research question.");
  if (question.length > MAX_ASSISTANT_QUESTION_LENGTH) {
    throw new AssistantServiceError("invalid_request", `Research questions must be ${MAX_ASSISTANT_QUESTION_LENGTH} characters or fewer.`);
  }
  if ([...question].some((character) => character.charCodeAt(0) < 32 && character !== "\n" && character !== "\t")) {
    throw new AssistantServiceError("invalid_request", "The research question contains unsupported control characters.");
  }
  return question;
}

export function normalizeAssistantRequest(value: unknown): AssistantRequest {
  if (!isObject(value)) throw new AssistantServiceError("invalid_request", "Send a research question in a JSON object.");
  const question = normalizeQuestion(value.question);
  const rawHistory = value.history ?? [];
  if (!Array.isArray(rawHistory) || rawHistory.length > MAX_ASSISTANT_HISTORY_TURNS) {
    throw new AssistantServiceError("invalid_request", "Follow-up context is invalid. Start a new question and try again.");
  }

  const history = rawHistory.map((entry): AssistantHistoryTurn => {
    if (!isObject(entry)) throw new AssistantServiceError("invalid_request", "Follow-up context is invalid. Start a new question and try again.");
    const priorQuestion = normalizeQuestion(entry.question);
    const sourceIds = entry.sourceIds ?? [];
    if (!Array.isArray(sourceIds) || sourceIds.length > MAX_ASSISTANT_CONTEXT_IDS || sourceIds.some((id) => typeof id !== "string" || !/^\d{1,20}$/.test(id) || Number(id) <= 0)) {
      throw new AssistantServiceError("invalid_request", "Follow-up source references are invalid. Start a new question and try again.");
    }
    return { question: priorQuestion, sourceIds: [...new Set(sourceIds as string[])] };
  });

  return { question, history };
}

function queryWords(question: string): string[] {
  return (question.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [])
    .filter((word) => !NTRS_QUERY_STOP_WORDS.has(word.toLocaleLowerCase()));
}

function sourceRelevanceScore(record: NtrsRecord, question: string): number {
  const terms = queryWords(question).map((word) => word.toLocaleLowerCase());
  const title = record.title.toLocaleLowerCase();
  const abstract = (record.abstract ?? "").toLocaleLowerCase();
  return terms.reduce((score, term) => score + (title.includes(term) ? 4 : 0) + (abstract.includes(term) ? 1 : 0), 0);
}

function cleanNtrsQuery(value: string): string {
  return value
    .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ASSISTANT_SEARCH_QUERY_LENGTH)
    .trim();
}

function uniqueQueries(values: string[]): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const query = cleanNtrsQuery(value);
    const key = query.toLocaleLowerCase();
    if (!query || seen.has(key)) continue;
    seen.add(key);
    queries.push(query);
    if (queries.length === MAX_ASSISTANT_SEARCH_QUERIES) break;
  }
  return queries;
}

/** Deterministic, short plain-text NASA queries used by the application search path. */
export function buildNtrsAssistantQueries(question: string): string[] {
  const lower = question.toLocaleLowerCase();
  const hasMicrogravity = /\b(?:microgravity|micro[- ]?g|reduced gravity|low gravity|zero gravity)\b/.test(lower);
  const prefix = hasMicrogravity ? "microgravity" : "combustion";
  const candidates: string[] = [];

  if (/\b(?:combustion|flame|fire|burning|ignition|extinction|soot|fuel)\b/.test(lower)) {
    candidates.push(hasMicrogravity ? "microgravity combustion" : "combustion research");
  }
  if (/\b(?:flame|flames|shape|structure|spread|behavio[u]?r)\b/.test(lower)) {
    candidates.push(`${prefix} flame structure`);
  }
  if (/\bsoot\b/.test(lower)) candidates.push(`${prefix} soot formation`);
  if (/\bignition\b/.test(lower)) candidates.push(`${prefix} ignition`);
  if (/\bextinction\b/.test(lower)) candidates.push(`${prefix} flame extinction`);
  if (/\b(?:spacecraft|spacecraft fire|fire safety|flammability)\b/.test(lower)) candidates.push("spacecraft fire safety");
  if (/\b(?:normal gravity|earth gravity|reduced gravity|low gravity)\b/.test(lower)) {
    candidates.push(/\bsoot\b/.test(lower) ? "reduced gravity soot formation" : "reduced gravity combustion");
  }

  const words = queryWords(question);
  if (words.length >= 2) candidates.push(words.slice(0, 5).join(" "));
  if (words.length >= 3) candidates.push(words.slice(0, 3).join(" "));

  const queries = uniqueQueries(candidates);
  if (queries.length >= MIN_ASSISTANT_SEARCH_QUERIES) return queries;

  const fallbackTerms = uniqueQueries([words.slice(0, 4).join(" "), words.slice(0, 2).join(" ")]);
  const merged = uniqueQueries([...queries, ...fallbackTerms, "microgravity combustion", "combustion research"]);
  return merged.slice(0, MAX_ASSISTANT_SEARCH_QUERIES);
}

/** Accept only a structured 2–4-query planner response with short, plain-text search strings. */
function validatedAssistantSearchQueries(value: unknown): string[] | null {
  if (!isObject(value) || !Array.isArray(value.queries) || value.queries.length < MIN_ASSISTANT_SEARCH_QUERIES || value.queries.length > MAX_ASSISTANT_SEARCH_QUERIES) {
    return null;
  }
  const queries = uniqueQueries(value.queries.filter((query): query is string => typeof query === "string"));
  return queries.length >= MIN_ASSISTANT_SEARCH_QUERIES ? queries : null;
}

export function normalizeAssistantSearchQueries(value: unknown, fallbackQuestion: string): string[] {
  return validatedAssistantSearchQueries(value) ?? buildNtrsAssistantQueries(fallbackQuestion);
}

export function buildNtrsAssistantQuery(question: string): string {
  return buildNtrsAssistantQueries(question)[0] ?? "microgravity combustion";
}

function sourceIsTraceable(record: NtrsRecord): boolean {
  return /^\d{1,20}$/.test(record.id)
    && Number(record.id) > 0
    && record.canonicalUrl === `https://ntrs.nasa.gov/citations/${encodeURIComponent(record.id)}`
    && typeof record.title === "string"
    && !!record.title.trim();
}

function assertSourceIsTraceable(record: NtrsRecord): void {
  if (!sourceIsTraceable(record)) {
    throw new AssistantServiceError("invalid_model_response", "A NASA source record could not be validated. Please try again.");
  }
}

function normalizeCitationList(value: unknown, allowedLabels: Set<string>): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4 || value.some((label) => typeof label !== "string")) {
    throw new AssistantServiceError("invalid_citation", "The generated answer did not include valid source citations.", "malformed_citation_list");
  }
  const labels = [...new Set(value as string[])];
  if (labels.some((label) => !allowedLabels.has(label))) {
    throw new AssistantServiceError("invalid_citation", "The generated answer referenced a source that was not retrieved for this question.", "unretrieved_citation_label");
  }
  return labels;
}

function normalizeClaim(value: unknown, sources: AssistantSource[]): AssistantClaim {
  if (!isObject(value) || typeof value.text !== "string") {
    throw new AssistantServiceError("invalid_model_response", "The generated answer could not be validated. Please try again.");
  }
  const text = value.text.trim();
  if (!text || text.length > 1_200 || /https?:\/\/|www\./i.test(text)) {
    throw new AssistantServiceError("invalid_model_response", "The generated answer could not be validated. Please try again.");
  }
  const allowedLabels = new Set(sources.map(({ label }) => label));
  const embeddedLabels = [...text.matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
  if (embeddedLabels.some((label) => !allowedLabels.has(label))) {
    throw new AssistantServiceError("invalid_citation", "The generated answer referenced a source that was not retrieved for this question.", "unretrieved_embedded_citation");
  }
  const citations = normalizeCitationList(value.citations, allowedLabels);
  const cleanedText = text.replace(/\[(S\d+)\]/g, "").replace(/\s{2,}/g, " ").trim();
  if (!cleanedText) throw new AssistantServiceError("invalid_model_response", "The generated answer could not be validated. Please try again.");
  if (/\b\d{8,20}\b/.test(cleanedText) || sources.some(({ record }) => cleanedText.includes(record.id))) {
    throw new AssistantServiceError("invalid_model_response", "NASA record identifiers are shown in the source cards and cannot be generated in answer text.");
  }
  const citedAbstracts = sources
    .filter(({ label }) => citations.includes(label))
    .map(({ record }) => record.abstract ?? "")
    .join(" ");
  const numericTokens = cleanedText.match(/(?<![A-Za-z0-9])[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:[Ee][-+]?\d+)?%?(?![A-Za-z0-9])/g) ?? [];
  if (numericTokens.some((token) => !citedAbstracts.includes(token.replace(/,/g, "")) && !citedAbstracts.includes(token))) {
    throw new AssistantServiceError("invalid_model_response", "The generated answer included a numeric detail that could not be verified in the cited source abstract.");
  }
  if (/\b10\.\d{4,9}\//i.test(cleanedText)) {
    throw new AssistantServiceError("invalid_model_response", "Bibliographic identifiers are shown in the source records and cannot be generated in the answer text.");
  }
  return { text: cleanedText, citations };
}

export function validateGeneratedAnswer(
  value: unknown,
  sources: AssistantSource[],
  onDiagnostic?: (event: AssistantDiagnosticEvent) => void,
): AssistantAnswer {
  const report = (event: AssistantDiagnosticEvent) => {
    try { onDiagnostic?.(event); } catch { /* Diagnostics must never alter answer validation. */ }
  };
  let parsed = value;
  const parseStartedAt = Date.now();
  if (typeof parsed === "string") {
    let jsonText = parsed.trim();
    const fencedJson = jsonText.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
    if (fencedJson?.[1]) jsonText = fencedJson[1].trim();
    try {
      parsed = JSON.parse(jsonText) as unknown;
    } catch {
      report({ stage: "response_parsing", elapsedTimeMs: Date.now() - parseStartedAt, outcome: "failed", code: "malformed_json" });
      throw new AssistantServiceError("invalid_model_response", "The generated answer could not be validated. Please try again.", "malformed_json");
    }
    report({ stage: "response_parsing", elapsedTimeMs: Date.now() - parseStartedAt, outcome: "passed" });
  } else {
    report({ stage: "response_parsing", elapsedTimeMs: 0, outcome: "not_needed" });
  }
  const validationStartedAt = Date.now();
  try {
    if (!isObject(parsed) || typeof parsed.sufficientEvidence !== "boolean" || !Array.isArray(parsed.findings) || !Array.isArray(parsed.uncertainties)) {
      throw new AssistantServiceError("invalid_model_response", "The generated answer could not be validated. Please try again.", "invalid_answer_shape");
    }
    if (parsed.findings.length > 5 || parsed.uncertainties.length > 3) {
      throw new AssistantServiceError("invalid_model_response", "The generated answer exceeded its supported length. Please try again.", "answer_exceeded_limits");
    }

    const findings = parsed.findings.map((claim) => normalizeClaim(claim, sources));
    const uncertainties = parsed.uncertainties.map((claim) => normalizeClaim(claim, sources));
    let interpretation: AssistantClaim | null;
    if (parsed.interpretation === null) interpretation = null;
    else if (isObject(parsed.interpretation) && parsed.interpretation.text === "" && Array.isArray(parsed.interpretation.citations) && parsed.interpretation.citations.length === 0) interpretation = null;
    else interpretation = normalizeClaim(parsed.interpretation, sources);

    report({ stage: "citation_validation", elapsedTimeMs: Date.now() - validationStartedAt, outcome: "passed" });
    report({ stage: "response_validation", elapsedTimeMs: Date.now() - validationStartedAt, outcome: "passed" });
    const hasAnswer = findings.length > 0 || interpretation !== null;
    return {
      sufficientEvidence: parsed.sufficientEvidence && hasAnswer,
      findings,
      interpretation,
      uncertainties,
    };
  } catch (error) {
    if (error instanceof AssistantServiceError && error.code === "invalid_citation") {
      report({ stage: "citation_validation", elapsedTimeMs: Date.now() - validationStartedAt, outcome: "failed", code: error.diagnosticCode ?? error.code });
    } else {
      report({
        stage: "response_validation",
        elapsedTimeMs: Date.now() - validationStartedAt,
        outcome: "failed",
        code: error instanceof AssistantServiceError ? error.diagnosticCode ?? error.code : "unexpected_validation_error",
      });
    }
    throw error;
  }
}

export type AssistantGenerationInput = {
  question: string;
  history: Array<{ question: string }>;
  sources: AssistantSource[];
};

export type AssistantDependencies = {
  search: (input: NtrsSearchInput) => Promise<NtrsSearchResult>;
  getCitation: (id: string) => Promise<NtrsRecord>;
  planQueries?: ((question: string, signal?: AbortSignal) => Promise<unknown>) | null;
  generate: ((input: AssistantGenerationInput, signal?: AbortSignal) => Promise<unknown>) | null;
  synthesisUnavailable?: { code: string; message: string };
  synthesisFailure?: (error: unknown) => { code: string; message: string };
};

function emptyAnswer(): AssistantAnswer {
  return { sufficientEvidence: false, findings: [], interpretation: null, uncertainties: [] };
}

function synthesisFailure(error: unknown, dependencies: AssistantDependencies): { code: string; message: string } {
  if (dependencies.synthesisFailure) return dependencies.synthesisFailure(error);
  return { code: "upstream", message: "Gemini could not complete this synthesis. The retrieved NASA records are shown below without an AI conclusion." };
}

export async function runGroundedResearchAssistant(
  rawInput: unknown,
  dependencies: AssistantDependencies,
  options: {
    signal?: AbortSignal;
    onQueryPlanningStart?: () => void;
    onRetrievalStart?: (queries: string[]) => void;
    onSynthesisStart?: () => void;
    onDiagnostic?: (event: AssistantDiagnosticEvent) => void;
  } = {},
): Promise<AssistantResult> {
  const requestStartedAt = Date.now();
  const report = (event: AssistantDiagnosticEvent) => {
    try { options.onDiagnostic?.(event); } catch { /* Diagnostics must never alter the assistant workflow. */ }
  };
  const complete = (result: AssistantResult): AssistantResult => {
    report({
      stage: "assistant_result",
      elapsedTimeMs: Date.now() - requestStartedAt,
      outcome: result.status,
      sourceCount: result.sources.length,
      uniqueRecordCount: result.search.uniqueRecordCount,
    });
    return result;
  };
  const input = normalizeAssistantRequest(rawInput);

  let queries = buildNtrsAssistantQueries(input.question);
  let planningSource: AssistantResult["search"]["planningSource"] = "deterministic";
  const planningStartedAt = Date.now();
  if (dependencies.planQueries) {
    options.onQueryPlanningStart?.();
    try {
      const planned = await dependencies.planQueries(input.question, options.signal);
      const validated = validatedAssistantSearchQueries(planned);
      if (validated) {
        queries = validated;
        planningSource = "gemini";
      }
    } catch (error) {
      if (options.signal?.aborted) throw error;
      // NASA retrieval must continue with the deterministic plan if planning is unavailable.
    }
  }
  report({
    stage: "query_planning",
    elapsedTimeMs: Date.now() - planningStartedAt,
    outcome: planningSource === "gemini" ? "planned" : "deterministic",
  });

  options.onRetrievalStart?.(queries);
  const contextIds = [...new Set(input.history.flatMap((turn) => turn.sourceIds))].slice(-MAX_ASSISTANT_CONTEXT_IDS);
  // The validated planner caps this list at four, bounding concurrent provider calls.
  const [searchOutcomes, contextRecords] = await Promise.all([
    Promise.allSettled(queries.map(async (query, queryIndex) => {
      const startedAt = Date.now();
      try {
        const result = await dependencies.search({ query, page: 1, pageSize: 8 });
        report({
          stage: "nasa_retrieval",
          retrievalKind: "search",
          queryIndex,
          elapsedTimeMs: Date.now() - startedAt,
          outcome: "returned",
          recordsReturned: result.results.length,
        });
        return result;
      } catch (error) {
        report({ stage: "nasa_retrieval", retrievalKind: "search", queryIndex, elapsedTimeMs: Date.now() - startedAt, outcome: "failed" });
        throw error;
      }
    })),
    Promise.allSettled(contextIds.map(async (id, contextIndex) => {
      const startedAt = Date.now();
      try {
        const record = await dependencies.getCitation(id);
        report({ stage: "nasa_retrieval", retrievalKind: "context", queryIndex: contextIndex, elapsedTimeMs: Date.now() - startedAt, outcome: "returned", recordsReturned: 1 });
        return record;
      } catch (error) {
        report({ stage: "nasa_retrieval", retrievalKind: "context", queryIndex: contextIndex, elapsedTimeMs: Date.now() - startedAt, outcome: "failed", recordsReturned: 0 });
        throw error;
      }
    })),
  ]);

  const successfulSearches = searchOutcomes.flatMap((outcome, index) => outcome.status === "fulfilled"
    ? [{ query: queries[index], result: outcome.value }]
    : []);
  if (successfulSearches.length === 0) {
    const firstFailure = searchOutcomes.find((outcome) => outcome.status === "rejected");
    if (firstFailure?.status === "rejected") throw firstFailure.reason;
  }

  const sourceSelectionStartedAt = Date.now();
  const uniqueCurrentRecords = new Map<string, NtrsRecord>();
  for (const { result } of successfulSearches) {
    for (const record of result.results) {
      assertSourceIsTraceable(record);
      if (!uniqueCurrentRecords.has(record.id)) uniqueCurrentRecords.set(record.id, record);
    }
  }
  const selectedCurrent = [...uniqueCurrentRecords.values()]
    .map((record, index) => ({ record, index, relevance: sourceRelevanceScore(record, input.question) }))
    .sort((left, right) => right.relevance - left.relevance || left.index - right.index)
    .slice(0, MAX_ASSISTANT_CURRENT_SOURCES)
    .map(({ record }) => record);
  const currentIds = new Set(selectedCurrent.map((record) => record.id));
  const availableContext = contextRecords.flatMap((entry) => entry.status === "fulfilled" && !currentIds.has(entry.value.id) ? [entry.value] : []);
  availableContext.forEach(assertSourceIsTraceable);

  const uniqueRecords = new Map<string, { role: AssistantSource["role"]; record: NtrsRecord }>();
  for (const record of selectedCurrent) uniqueRecords.set(record.id, { role: "current question", record });
  for (const record of availableContext) {
    if (!uniqueRecords.has(record.id) && uniqueRecords.size < MAX_ASSISTANT_SOURCES) {
      uniqueRecords.set(record.id, { role: "follow-up context", record });
    }
  }
  const sources: AssistantSource[] = [...uniqueRecords.values()].map(({ role, record }, index) => ({ label: `S${index + 1}`, role, record }));
  const unavailableContextSourceCount = contextRecords.filter((entry) => entry.status === "rejected").length;
  const searchMetadata = {
    queries: searchOutcomes.map((outcome, index) => outcome.status === "fulfilled"
      ? { query: queries[index], status: "returned" as const, recordsReturned: outcome.value.results.length }
      : { query: queries[index], status: "failed" as const, recordsReturned: null }),
    planningSource,
    uniqueRecordCount: uniqueCurrentRecords.size,
    selectedRecordCount: selectedCurrent.length,
  };
  report({
    stage: "source_selection",
    elapsedTimeMs: Date.now() - sourceSelectionStartedAt,
    outcome: "complete",
    uniqueRecordCount: uniqueCurrentRecords.size,
    sourceCount: sources.length,
  });

  if (sources.length === 0 || !sources.some(({ record }) => !!record.abstract?.trim())) {
    return complete({
      status: "insufficient_evidence",
      question: input.question,
      search: searchMetadata,
      sources,
      unavailableContextSourceCount,
      answer: emptyAnswer(),
      evidenceNotice: sources.length === 0
        ? "NASA NTRS returned no source records for these searches. This bounded search does not show that the broader literature contains no evidence."
        : "The available NASA NTRS records did not include abstracts with enough evidence to support an AI synthesis. No scientific conclusion was generated.",
      synthesisError: null,
    });
  }

  if (!dependencies.generate) {
    return complete({
      status: "retrieved_only",
      question: input.question,
      search: searchMetadata,
      sources,
      unavailableContextSourceCount,
      answer: emptyAnswer(),
      evidenceNotice: dependencies.synthesisUnavailable?.message ?? "NASA records were retrieved, but Gemini synthesis is unavailable. No AI conclusion was generated.",
      synthesisError: dependencies.synthesisUnavailable ?? { code: "not_configured", message: "Gemini synthesis is not configured." },
    });
  }

  options.onSynthesisStart?.();
  let rawAnswer: unknown;
  try {
    rawAnswer = await dependencies.generate({
      question: input.question,
      history: input.history.map(({ question }) => ({ question })),
      sources,
    }, options.signal);
  } catch (error) {
    const failure = synthesisFailure(error, dependencies);
    return complete({
      status: "retrieved_only",
      question: input.question,
      search: searchMetadata,
      sources,
      unavailableContextSourceCount,
      answer: emptyAnswer(),
      evidenceNotice: failure.message,
      synthesisError: failure,
    });
  }
  let answer: AssistantAnswer;
  try {
    answer = validateGeneratedAnswer(rawAnswer, sources, report);
  } catch (error) {
    const failure = synthesisFailure(error, dependencies);
    return complete({
      status: "retrieved_only",
      question: input.question,
      search: searchMetadata,
      sources,
      unavailableContextSourceCount,
      answer: emptyAnswer(),
      evidenceNotice: failure.message,
      synthesisError: failure,
    });
  }
  const sufficientEvidence = answer.sufficientEvidence;
  return complete({
    status: sufficientEvidence ? "answered" : "insufficient_evidence",
    question: input.question,
    search: searchMetadata,
    sources,
    unavailableContextSourceCount,
    answer,
    evidenceNotice: sufficientEvidence ? null : "The available NASA NTRS records do not provide sufficient evidence to answer this question. Treat any partial findings as limited to the sources shown.",
    synthesisError: null,
  });
}
