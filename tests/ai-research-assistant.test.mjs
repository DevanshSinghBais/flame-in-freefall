import test from "node:test";
import assert from "node:assert/strict";
import {
  AssistantServiceError,
  MAX_ASSISTANT_REQUEST_BYTES,
  buildNtrsAssistantQuery,
  buildNtrsAssistantQueries,
  normalizeAssistantSearchQueries,
  normalizeAssistantRequest,
  readBoundedJsonBody,
  runGroundedResearchAssistant,
  validateGeneratedAnswer,
} from "../src/lib/ai-research-assistant-core.ts";
import { NtrsProviderError } from "../src/lib/ntrs-provider-core.ts";

// These small fixtures exercise injected provider boundaries only. The application
// always uses the live NASA NTRS adapter and does not ship seeded research records.
const record = (id = "20150023100", overrides = {}) => ({
  id,
  canonicalUrl: `https://ntrs.nasa.gov/citations/${id}`,
  title: "NASA Technical Report on Microgravity Combustion",
  abstract: "The source abstract describes combustion experiments in a microgravity environment.",
  authors: ["Author, A."],
  publicationDate: "2015-10-20T00:00:00Z",
  doi: undefined,
  documentType: "Technical Memorandum",
  center: "Glenn Research Center",
  subjectCategories: ["Combustion"],
  fullTextLinks: [],
  ...overrides,
});

const searchResult = (results = [record()], overrides = {}) => ({
  query: "microgravity combustion",
  page: 1,
  pageSize: 8,
  total: results.length,
  totalIsEstimate: false,
  results,
  facets: { stiTypes: [], centers: [], subjectCategories: [] },
  partial: false,
  skippedRecords: 0,
  ...overrides,
});

const groundedAnswer = (overrides = {}) => ({
  sufficientEvidence: true,
  findings: [{ text: "The supplied abstract describes combustion experiments in microgravity.", citations: ["S1"] }],
  interpretation: { text: "The record is directly relevant to the question, but its abstract alone limits the available detail.", citations: ["S1"] },
  uncertainties: [],
  ...overrides,
});

const source = (label = "S1") => ({ label, role: "current question", record: record() });

function dependencies(overrides = {}) {
  return {
    search: async () => searchResult(),
    getCitation: async (id) => record(id),
    planQueries: null,
    generate: async () => groundedAnswer(),
    ...overrides,
  };
}

test("retrieves NASA sources first, then generates a cited answer with preserved provenance", async () => {
  const events = [];
  let generationInput;
  const result = await runGroundedResearchAssistant({ question: "  What does the record say about microgravity combustion?  " }, dependencies({
    search: async (input) => { events.push(`retrieval:${input.query}`); assert.equal(input.page, 1); assert.equal(input.pageSize, 8); return searchResult(); },
    generate: async (input) => { events.push("generation"); generationInput = input; return groundedAnswer(); },
  }), { onRetrievalStart: () => events.push("retrieval-start"), onSynthesisStart: () => events.push("synthesis") });

  assert.equal(events.filter((event) => event.startsWith("retrieval:")).length, result.search.queries.length);
  assert.equal(events.at(-2), "synthesis");
  assert.equal(events.at(-1), "generation");
  assert.equal(result.status, "answered");
  assert.equal(result.question, "What does the record say about microgravity combustion?");
  assert.equal(result.search.uniqueRecordCount, 1);
  assert.equal(result.search.selectedRecordCount, 1);
  assert.equal(result.sources[0].label, "S1");
  assert.equal(result.sources[0].record.id, "20150023100");
  assert.equal(result.sources[0].record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.deepEqual(result.answer.findings[0].citations, ["S1"]);
  assert.equal(generationInput.sources[0].record.canonicalUrl, result.sources[0].record.canonicalUrl);
});

test("empty NASA search results return an explicit insufficient-evidence answer without calling Gemini", async () => {
  let generated = false;
  const result = await runGroundedResearchAssistant({ question: "microgravity flame spread" }, dependencies({
    search: async () => searchResult([], { total: 0 }),
    generate: async () => { generated = true; return groundedAnswer(); },
  }));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.answer.sufficientEvidence, false);
  assert.match(result.evidenceNotice, /bounded search/i);
  assert.deepEqual(result.sources, []);
  assert.equal(generated, false);
});

test("NASA provider failures stop the request before Gemini can answer", async () => {
  let generated = false;
  await assert.rejects(runGroundedResearchAssistant({ question: "microgravity combustion" }, dependencies({
    search: async () => { throw new NtrsProviderError("upstream failure", "upstream"); },
    generate: async () => { generated = true; return groundedAnswer(); },
  })), (error) => error instanceof NtrsProviderError && error.kind === "upstream");
  assert.equal(generated, false);
});

test("missing Gemini configuration still retrieves NASA sources and does not invent an answer", async () => {
  let searched = 0;
  const result = await runGroundedResearchAssistant({ question: "microgravity combustion" }, dependencies({
    search: async () => { searched += 1; return searchResult(); },
    generate: null,
    synthesisUnavailable: { code: "not_configured", message: "Gemini is not configured." },
  }));
  assert.equal(searched, result.search.queries.length);
  assert.equal(result.status, "retrieved_only");
  assert.equal(result.sources[0].record.id, "20150023100");
  assert.equal(result.answer.findings.length, 0);
  assert.match(result.evidenceNotice, /not configured/i);
});

test("Gemini quota failures preserve retrieved sources and do not become answers", async () => {
  const quotaError = Object.assign(new Error("quota"), { status: 429 });
  const result = await runGroundedResearchAssistant({ question: "microgravity combustion" }, dependencies({
    generate: async () => { throw quotaError; },
    synthesisFailure: () => ({ code: "quota", message: "AI service quota reached." }),
  }));
  assert.equal(result.status, "retrieved_only");
  assert.equal(result.sources[0].record.id, "20150023100");
  assert.equal(result.synthesisError.code, "quota");
  assert.match(result.evidenceNotice, /quota/i);
});

test("valid generated citation labels are accepted and normalized", () => {
  const answer = validateGeneratedAnswer({
    ...groundedAnswer(),
    findings: [{ text: "The supplied abstract describes the experiments. [S1]", citations: ["S1"] }],
  }, [source()]);
  assert.equal(answer.findings[0].text, "The supplied abstract describes the experiments.");
  assert.deepEqual(answer.findings[0].citations, ["S1"]);
});

test("a complete JSON code fence is removed before the existing evidence and citation checks", () => {
  const generated = `\`\`\`json\n${JSON.stringify(groundedAnswer({
    findings: [{ text: "The supplied abstract describes the experiments. [S1]", citations: ["S1"] }],
  }))}\n\`\`\``;
  const answer = validateGeneratedAnswer(generated, [source()]);
  assert.equal(answer.findings[0].text, "The supplied abstract describes the experiments.");
  assert.deepEqual(answer.findings[0].citations, ["S1"]);
});

test("prose surrounding a fenced JSON object is still rejected", () => {
  const generated = `Answer:\n\`\`\`json\n${JSON.stringify(groundedAnswer())}\n\`\`\``;
  assert.throws(() => validateGeneratedAnswer(generated, [source()]), (error) => error.code === "invalid_model_response");
});

test("fabricated citation labels are rejected in structured citations and answer text", () => {
  assert.throws(() => validateGeneratedAnswer(groundedAnswer({
    findings: [{ text: "A claim", citations: ["S8"] }],
  }), [source()]), (error) => error instanceof AssistantServiceError && error.code === "invalid_citation");
  assert.throws(() => validateGeneratedAnswer(groundedAnswer({
    interpretation: { text: "A claim [S99]", citations: ["S1"] },
  }), [source()]), (error) => error instanceof AssistantServiceError && error.code === "invalid_citation");
});

test("answer validation reports safe parsing and invalid-citation stages without exposing model output", () => {
  const diagnostics = [];
  assert.throws(() => validateGeneratedAnswer("not JSON", [source()], (event) => diagnostics.push(event)), (error) => error.code === "invalid_model_response");
  assert.deepEqual(diagnostics[0], { stage: "response_parsing", elapsedTimeMs: diagnostics[0].elapsedTimeMs, outcome: "failed", code: "malformed_json" });

  diagnostics.length = 0;
  assert.throws(() => validateGeneratedAnswer(groundedAnswer({
    findings: [{ text: "A supported statement.", citations: ["S99"] }],
  }), [source()], (event) => diagnostics.push(event)), (error) => error.code === "invalid_citation");
  assert.deepEqual(diagnostics[0], { stage: "response_parsing", elapsedTimeMs: 0, outcome: "not_needed" });
  assert.deepEqual(diagnostics.at(-1), { stage: "citation_validation", elapsedTimeMs: diagnostics.at(-1).elapsedTimeMs, outcome: "failed", code: "unretrieved_citation_label" });
});

test("a model-declared evidence gap produces a visible insufficient-evidence result", async () => {
  const result = await runGroundedResearchAssistant({ question: "Are exact extinction thresholds available?" }, dependencies({
    generate: async () => groundedAnswer({
      sufficientEvidence: false,
      findings: [],
      interpretation: { text: "", citations: [] },
      uncertainties: [],
    }),
  }));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.answer.interpretation, null);
  assert.match(result.evidenceNotice, /do not provide sufficient evidence/i);
});

test("follow-ups re-fetch only bounded prior NASA identifiers and preserve source URLs", async () => {
  const lookedUp = [];
  let inputToGemini;
  const result = await runGroundedResearchAssistant({
    question: "What limitations should I consider?",
    history: [{ question: "How does microgravity affect flame shape?", sourceIds: ["20150023100"] }],
  }, dependencies({
    search: async () => searchResult([], { total: 0 }),
    getCitation: async (id) => { lookedUp.push(id); return record(id); },
    generate: async (input) => { inputToGemini = input; return groundedAnswer(); },
  }));
  assert.deepEqual(lookedUp, ["20150023100"]);
  assert.equal(inputToGemini.history[0].question, "How does microgravity affect flame shape?");
  assert.equal(result.sources[0].role, "follow-up context");
  assert.equal(result.sources[0].record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.equal(result.search.uniqueRecordCount, 0);
});

test("records without abstracts are not sent to Gemini as scientific evidence", async () => {
  let generated = false;
  const result = await runGroundedResearchAssistant({ question: "What was measured?" }, dependencies({
    search: async () => searchResult([record("20150023100", { abstract: undefined })]),
    generate: async () => { generated = true; return groundedAnswer(); },
  }));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.sources[0].record.abstract, undefined);
  assert.equal(generated, false);
});

test("invalid and oversized questions are rejected before external providers are called", async () => {
  assert.throws(() => normalizeAssistantRequest({ question: "   " }), (error) => error.code === "invalid_request");
  assert.throws(() => normalizeAssistantRequest({ question: "x".repeat(501) }), (error) => error.code === "invalid_request");
  await assert.rejects(readBoundedJsonBody(new Request("https://local.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "x".repeat(MAX_ASSISTANT_REQUEST_BYTES + 1) }),
  })), (error) => error instanceof AssistantServiceError && error.code === "request_too_large");
});

test("natural-language questions are normalized to bounded NASA search terms", () => {
  const question = "What do NASA NTRS abstracts report about flame behaviour in microgravity?";
  assert.equal(buildNtrsAssistantQuery(question), "microgravity combustion");
  assert.deepEqual(buildNtrsAssistantQueries(question), ["microgravity combustion", "microgravity flame structure", "flame behaviour microgravity"]);
  assert.ok(buildNtrsAssistantQuery("flame ".repeat(120)).length <= 120);
});

test("long natural-language questions become concise scientific queries and remain intact for synthesis", async () => {
  const question = "How does microgravity affect flame shape and soot formation compared with normal gravity? Summarize the available NASA research, distinguish established findings from uncertainty, and cite the original sources.";
  const searches = [];
  let generationInput;
  const result = await runGroundedResearchAssistant({ question }, dependencies({
    search: async (input) => { searches.push(input.query); return searchResult([record(input.query.includes("soot") ? "20150023101" : "20150023100")], { query: input.query }); },
    generate: async (input) => { generationInput = input; return groundedAnswer(); },
  }));

  assert.deepEqual(searches, result.search.queries.map(({ query: used }) => used));
  assert.deepEqual(searches, ["microgravity combustion", "microgravity flame structure", "microgravity soot formation", "reduced gravity soot formation"]);
  assert.equal(result.search.planningSource, "deterministic");
  assert.equal(result.question, question);
  assert.equal(generationInput.question, question);
  assert.equal(result.search.uniqueRecordCount, 2);
});

test("malformed or duplicate planner output uses deterministic fallback queries", async () => {
  const question = "How does microgravity affect flame shape and soot formation?";
  const expected = buildNtrsAssistantQueries(question);
  const result = await runGroundedResearchAssistant({ question }, dependencies({
    planQueries: async () => ({ queries: ["microgravity combustion", "MICROGRAVITY COMBUSTION"] }),
    search: async (input) => searchResult([], { query: input.query, total: 0 }),
  }));
  assert.equal(result.search.planningSource, "deterministic");
  assert.deepEqual(result.search.queries.map(({ query }) => query), expected);
  assert.deepEqual(normalizeAssistantSearchQueries({ queries: ["too long?".repeat(30)] }, question), expected);
});

test("multiple NASA queries run and duplicate records are merged by stable record id", async () => {
  const calls = [];
  let maximumActive = 0;
  let active = 0;
  const duplicateWithDifferentMetadata = record("20150023100", { title: "Second query title" });
  const result = await runGroundedResearchAssistant({ question: "Microgravity flame shape and soot formation" }, dependencies({
    planQueries: async () => ({ queries: ["microgravity flame shape", "microgravity soot formation", "reduced gravity combustion"] }),
    search: async ({ query }) => {
      calls.push(query);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return searchResult(query.includes("soot") ? [record("20150023101"), duplicateWithDifferentMetadata] : [record()], { query });
    },
  }));

  assert.deepEqual(calls, ["microgravity flame shape", "microgravity soot formation", "reduced gravity combustion"]);
  assert.equal(maximumActive, 3);
  assert.equal(result.search.uniqueRecordCount, 2);
  assert.deepEqual(result.sources.map(({ record: sourceRecord }) => sourceRecord.id), ["20150023100", "20150023101"]);
  assert.equal(result.sources[0].record.title, "NASA Technical Report on Microgravity Combustion");
});

test("partial NASA query failures preserve successful records and identify failed searches", async () => {
  const result = await runGroundedResearchAssistant({ question: "microgravity flame and soot" }, dependencies({
    planQueries: async () => ({ queries: ["microgravity flame", "microgravity soot"] }),
    search: async ({ query }) => {
      if (query.includes("soot")) throw new NtrsProviderError("timeout", "timeout");
      return searchResult([record()], { query });
    },
  }));
  assert.equal(result.search.uniqueRecordCount, 1);
  assert.deepEqual(result.search.queries.map(({ status }) => status), ["returned", "failed"]);
  assert.equal(result.status, "answered");
});

test("all planned queries returning zero records do not call Gemini", async () => {
  let generated = false;
  const result = await runGroundedResearchAssistant({ question: "microgravity flame" }, dependencies({
    planQueries: async () => ({ queries: ["microgravity flame", "reduced gravity combustion"] }),
    search: async (input) => searchResult([], { query: input.query, total: 0 }),
    generate: async () => { generated = true; return groundedAnswer(); },
  }));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.search.uniqueRecordCount, 0);
  assert.equal(result.search.queries.length, 2);
  assert.equal(generated, false);
  assert.match(result.evidenceNotice, /bounded search/i);
});

test("all NTRS query failures stop synthesis and surface a provider failure", async () => {
  let generated = false;
  await assert.rejects(runGroundedResearchAssistant({ question: "microgravity flame" }, dependencies({
    planQueries: async () => ({ queries: ["microgravity flame", "reduced gravity combustion"] }),
    search: async () => { throw new NtrsProviderError("provider timeout", "timeout"); },
    generate: async () => { generated = true; return groundedAnswer(); },
  })), (error) => error instanceof NtrsProviderError && error.kind === "timeout");
  assert.equal(generated, false);
});

test("query planner timeouts use deterministic searches, then synthesize only from retrieved NASA records", async () => {
  const question = "How does microgravity affect flame shape and soot formation?";
  let generationInput;
  const result = await runGroundedResearchAssistant({ question }, dependencies({
    planQueries: async () => { throw new Error("planner timeout"); },
    search: async () => searchResult([record()]),
    generate: async (input) => { generationInput = input; return groundedAnswer(); },
  }));
  assert.equal(result.search.planningSource, "deterministic");
  assert.equal(result.status, "answered");
  assert.equal(generationInput.sources[0].record.id, "20150023100");
});

test("synthesis timeouts preserve retrieved records and show no generic Gemini answer", async () => {
  const result = await runGroundedResearchAssistant({ question: "microgravity combustion" }, dependencies({
    generate: async () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); },
    synthesisFailure: () => ({ code: "timeout", message: "Gemini timed out." }),
  }));
  assert.equal(result.status, "retrieved_only");
  assert.equal(result.sources.length, 1);
  assert.equal(result.answer.findings.length, 0);
  assert.equal(result.synthesisError.code, "timeout");
});

test("citation validation failures preserve retrieved NASA records and suppress the invalid answer", async () => {
  const result = await runGroundedResearchAssistant({ question: "microgravity combustion" }, dependencies({
    generate: async () => groundedAnswer({
      findings: [{ text: "The source reports a combustion experiment.", citations: ["S99"] }],
    }),
    synthesisFailure: (error) => ({ code: error.code, message: "The generated answer could not be verified against the retrieved records." }),
  }));

  assert.equal(result.status, "retrieved_only");
  assert.equal(result.sources[0].record.id, "20150023100");
  assert.equal(result.sources[0].record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.deepEqual(result.answer.findings, []);
  assert.equal(result.answer.interpretation, null);
  assert.equal(result.synthesisError.code, "invalid_citation");
  assert.match(result.evidenceNotice, /could not be verified/i);
});

test("a broader NASA query is attempted when the narrow query returns zero records", async () => {
  const queries = [];
  const result = await runGroundedResearchAssistant({ question: "How does flame shape change in microgravity?" }, dependencies({
    planQueries: async () => ({ queries: ["microgravity flame shape", "microgravity combustion"] }),
    search: async (input) => { queries.push(input.query); return input.query === "microgravity flame shape" ? searchResult([], { query: input.query, total: 0 }) : searchResult([record()], { query: input.query }); },
  }));
  assert.deepEqual(queries, ["microgravity flame shape", "microgravity combustion"]);
  assert.deepEqual(result.search.queries.map(({ query }) => query), queries);
  assert.equal(result.sources[0].record.id, "20150023100");
});

test("malformed model output and model-generated links are rejected", () => {
  assert.throws(() => validateGeneratedAnswer("not JSON", [source()]), (error) => error.code === "invalid_model_response");
  assert.throws(() => validateGeneratedAnswer(groundedAnswer({
    findings: [{ text: "See https://example.com/report", citations: ["S1"] }],
  }), [source()]), (error) => error.code === "invalid_model_response");
});

test("numeric claims must appear in the cited NASA abstract", () => {
  assert.throws(() => validateGeneratedAnswer(groundedAnswer({
    findings: [{ text: "The flame speed was 3.5 m/s.", citations: ["S1"] }],
  }), [source()]), (error) => error instanceof AssistantServiceError && error.code === "invalid_model_response");
});
