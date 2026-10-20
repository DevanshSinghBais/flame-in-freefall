import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_SYNTHESIS_MODEL,
  hasGeminiApiKey,
  resolveGeminiModelConfiguration,
  runGeminiWithReliability,
} from "../src/lib/gemini-reliability-core.ts";
import {
  buildNtrsAssistantQueries,
  runGroundedResearchAssistant,
} from "../src/lib/ai-research-assistant-core.ts";

const policy = {
  attemptTimeoutMs: 1_000,
  requestDeadlineMs: 5_000,
  initialRetryDelayMs: 10,
  maxRetryDelayMs: 25,
};

const immediateOptions = (overrides = {}) => ({
  operation: "synthesis",
  models: [{ model: "gemini-3.6-flash", attempts: 2 }],
  policy,
  random: () => 0,
  sleep: async () => {},
  ...overrides,
});

const record = () => ({
  id: "20150023100",
  canonicalUrl: "https://ntrs.nasa.gov/citations/20150023100",
  title: "NASA Technical Report on Microgravity Combustion",
  abstract: "The source abstract describes combustion experiments in a microgravity environment.",
  authors: ["Author, A."],
  publicationDate: "2015-10-20T00:00:00Z",
  documentType: "Technical Memorandum",
  center: "Glenn Research Center",
  subjectCategories: ["Combustion"],
  fullTextLinks: [],
});

const answer = {
  sufficientEvidence: true,
  findings: [{ text: "The supplied abstract describes combustion experiments in microgravity.", citations: ["S1"] }],
  interpretation: { text: "The abstract supports a limited summary of the experiment topic.", citations: ["S1"] },
  uncertainties: [],
};

function assistantDependencies(overrides = {}) {
  const nasaRecord = record();
  return {
    search: async ({ query, page, pageSize }) => ({
      query,
      page,
      pageSize,
      total: 1,
      totalIsEstimate: false,
      results: [nasaRecord],
      facets: { stiTypes: [], centers: [], subjectCategories: [] },
      partial: false,
      skippedRecords: 0,
    }),
    getCitation: async () => nasaRecord,
    planQueries: null,
    generate: async () => answer,
    ...overrides,
  };
}

test("model configuration defaults to 3.6 Flash synthesis and 3.5 Flash-Lite planning and fallback", () => {
  assert.deepEqual(resolveGeminiModelConfiguration({}), {
    primaryModel: DEFAULT_GEMINI_SYNTHESIS_MODEL,
    fallbackModel: DEFAULT_GEMINI_FALLBACK_MODEL,
    planningModel: DEFAULT_GEMINI_FALLBACK_MODEL,
  });
  assert.deepEqual(resolveGeminiModelConfiguration({
    GEMINI_SYNTHESIS_MODEL: "gemini-custom-primary",
    GEMINI_FALLBACK_MODEL: "gemini-custom-fallback",
    GEMINI_PLANNING_MODEL: "gemini-custom-planner",
  }), {
    primaryModel: "gemini-custom-primary",
    fallbackModel: "gemini-custom-fallback",
    planningModel: "gemini-custom-planner",
  });
  assert.equal(resolveGeminiModelConfiguration({ GEMINI_MODEL: "gemini-legacy-config" }).primaryModel, "gemini-legacy-config");
  assert.throws(() => resolveGeminiModelConfiguration({ GEMINI_SYNTHESIS_MODEL: "not-a-gemini-model" }));
});

test("missing and blank API-key configuration can be detected without exposing a value", () => {
  assert.equal(hasGeminiApiKey({}), false);
  assert.equal(hasGeminiApiKey({ GEMINI_API_KEY: "  " }), false);
  assert.equal(hasGeminiApiKey({ GEMINI_API_KEY: "test-only-placeholder" }), true);
});

test("primary model success returns its result and emits safe attempt diagnostics", async () => {
  const calls = [];
  const diagnostics = [];
  const value = await runGeminiWithReliability(immediateOptions({
    onAttempt: (diagnostic) => diagnostics.push(diagnostic),
    request: async (model, context) => { calls.push([model, context.attemptNumber]); return "answer"; },
  }));
  assert.equal(value, "answer");
  assert.deepEqual(calls, [["gemini-3.6-flash", 1]]);
  assert.deepEqual(diagnostics, [{
    operation: "synthesis",
    modelIdentifier: "gemini-3.6-flash",
    httpStatus: null,
    providerErrorCategory: null,
    attemptNumber: 1,
    elapsedTimeMs: diagnostics[0].elapsedTimeMs,
    applicationAttemptTimeoutMs: policy.attemptTimeoutMs,
    fallbackAttempted: false,
  }]);
  assert.ok(diagnostics[0].elapsedTimeMs >= 0);
});

test("a transient 503 is retried once on the primary model", async () => {
  const calls = [];
  const diagnostics = [];
  const value = await runGeminiWithReliability(immediateOptions({
    onAttempt: (diagnostic) => diagnostics.push(diagnostic),
    request: async (model, context) => {
      calls.push([model, context.attemptNumber]);
      if (calls.length === 1) throw Object.assign(new Error("temporary service outage"), { status: 503 });
      return "recovered";
    },
  }));
  assert.equal(value, "recovered");
  assert.deepEqual(calls, [["gemini-3.6-flash", 1], ["gemini-3.6-flash", 2]]);
  assert.equal(diagnostics[0].providerErrorCategory, "availability");
  assert.equal(diagnostics[0].httpStatus, 503);
  assert.equal(diagnostics[1].providerErrorCategory, null);
  assert.equal(diagnostics.some(({ fallbackAttempted }) => fallbackAttempted), false);
});

test("a retryable 429 is retried within the configured attempt bound", async () => {
  let calls = 0;
  const value = await runGeminiWithReliability(immediateOptions({
    request: async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error("rate limited"), { status: 429 });
      return "available";
    },
  }));
  assert.equal(value, "available");
  assert.equal(calls, 2);
});

test("HTTP 500 and 504 are treated as transient and can succeed on a bounded retry", async () => {
  for (const status of [500, 504]) {
    let calls = 0;
    const diagnostics = [];
    const result = await runGeminiWithReliability(immediateOptions({
      onAttempt: (diagnostic) => diagnostics.push(diagnostic),
      request: async () => {
        calls += 1;
        if (calls === 1) throw Object.assign(new Error("temporary provider failure"), { status });
        return "recovered";
      },
    }));
    assert.equal(result, "recovered");
    assert.equal(calls, 2);
    assert.equal(diagnostics[0].httpStatus, status);
    assert.equal(diagnostics[0].providerErrorCategory, status === 504 ? "timeout" : "availability");
    if (status === 504) assert.equal(diagnostics[0].timeoutOrigin, "upstream_http");
  }
});

test("a persistently unavailable primary makes one bounded fallback attempt", async () => {
  const calls = [];
  const diagnostics = [];
  const result = await runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
    onAttempt: (diagnostic) => diagnostics.push(diagnostic),
    request: async (model, context) => {
      calls.push([model, context.attemptNumber]);
      if (model === "gemini-3.5-flash-lite") return "fallback answer";
      throw Object.assign(new Error("service unavailable"), { status: 503 });
    },
  }));
  assert.equal(result, "fallback answer");
  assert.deepEqual(calls, [
    ["gemini-3.6-flash", 1],
    ["gemini-3.6-flash", 2],
    ["gemini-3.5-flash-lite", 3],
  ]);
  assert.ok(diagnostics.every(({ fallbackAttempted }) => fallbackAttempted));
  assert.equal(diagnostics.at(-1).modelIdentifier, "gemini-3.5-flash-lite");
});

test("both models failing returns a bounded error with safe diagnostics", async () => {
  const diagnostics = [];
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
    onAttempt: (diagnostic) => diagnostics.push(diagnostic),
    request: async () => { throw Object.assign(new Error("upstream unavailable"), { status: 503 }); },
  })), (error) => error.category === "availability" && error.httpStatus === 503);
  assert.equal(diagnostics.length, 3);
  assert.ok(diagnostics.every(({ fallbackAttempted }) => fallbackAttempted));
  assert.deepEqual(diagnostics.map(({ httpStatus, attemptNumber }) => [httpStatus, attemptNumber]), [[503, 1], [503, 2], [503, 3]]);
});

test("authentication and malformed client requests are permanent and do not retry or fall back", async () => {
  for (const [status, category] of [[401, "authentication"], [400, "invalid_request"]]) {
    let calls = 0;
    await assert.rejects(runGeminiWithReliability(immediateOptions({
      models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
      request: async () => { calls += 1; throw Object.assign(new Error("permanent error"), { status }); },
    })), (error) => error.category === category && error.httpStatus === status);
    assert.equal(calls, 1);
  }
});

test("malformed successful payloads do not trigger retries or model fallback", async () => {
  let calls = 0;
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
    request: async () => {
      calls += 1;
      throw Object.assign(new Error("invalid generated JSON"), { providerErrorCategory: "malformed_response" });
    },
  })), (error) => error.category === "malformed_response");
  assert.equal(calls, 1);
});

test("retry limits and the total request deadline prevent long-running calls", async () => {
  const calls = [];
  const diagnostics = [];
  const started = Date.now();
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
    policy: { attemptTimeoutMs: 500, requestDeadlineMs: 35, initialRetryDelayMs: 1, maxRetryDelayMs: 1 },
    onAttempt: (diagnostic) => diagnostics.push(diagnostic),
    request: async (model) => { calls.push(model); return new Promise(() => {}); },
  })), (error) => error.category === "timeout");
  assert.equal(calls.length, 1);
  assert.equal(diagnostics[0].timeoutOrigin, "application_deadline");
  assert.ok(Date.now() - started < 250);

  let retryCalls = 0;
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
    request: async () => { retryCalls += 1; throw Object.assign(new Error("unavailable"), { status: 503 }); },
  })), (error) => error.httpStatus === 503);
  assert.equal(retryCalls, 3);
});

test("per-attempt app abort and SDK timeout errors are distinguished from upstream HTTP timeouts", async () => {
  const appDiagnostics = [];
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 1 }],
    policy: { attemptTimeoutMs: 10, requestDeadlineMs: 200, initialRetryDelayMs: 0, maxRetryDelayMs: 0 },
    onAttempt: (diagnostic) => appDiagnostics.push(diagnostic),
    request: async () => new Promise(() => {}),
  })), (error) => error.category === "timeout");
  assert.equal(appDiagnostics[0].timeoutOrigin, "application_attempt_timeout");

  const sdkDiagnostics = [];
  await assert.rejects(runGeminiWithReliability(immediateOptions({
    models: [{ model: "gemini-3.6-flash", attempts: 1 }],
    onAttempt: (diagnostic) => sdkDiagnostics.push(diagnostic),
    request: async () => { throw Object.assign(new Error("SDK timeout"), { name: "TimeoutError" }); },
  })), (error) => error.category === "timeout");
  assert.equal(sdkDiagnostics[0].timeoutOrigin, "sdk_timeout");
});

test("query-planning failure uses deterministic queries and keeps the original NASA sources for synthesis", async () => {
  const question = "How does microgravity affect flame shape and soot formation?";
  let plannerCalls = 0;
  let synthesisInput;
  const result = await runGroundedResearchAssistant({ question }, assistantDependencies({
    planQueries: async (receivedQuestion) => {
      assert.equal(receivedQuestion, question);
      return runGeminiWithReliability({
        operation: "planning",
        models: [{ model: DEFAULT_GEMINI_FALLBACK_MODEL, attempts: 2 }],
        policy,
        random: () => 0,
        sleep: async () => {},
        request: async () => { plannerCalls += 1; throw Object.assign(new Error("temporarily unavailable"), { status: 503 }); },
      });
    },
    search: async ({ query, page, pageSize }) => ({
      query, page, pageSize, total: 1, totalIsEstimate: false, results: [record()],
      facets: { stiTypes: [], centers: [], subjectCategories: [] }, partial: false, skippedRecords: 0,
    }),
    generate: async (input) => { synthesisInput = input; return answer; },
  }));
  assert.equal(plannerCalls, 2);
  assert.equal(result.search.planningSource, "deterministic");
  assert.deepEqual(result.search.queries.map(({ query }) => query), buildNtrsAssistantQueries(question));
  assert.equal(result.status, "answered");
  assert.equal(synthesisInput.question, question);
  assert.equal(synthesisInput.sources[0].record.id, "20150023100");
});

test("citation validation still runs on a fallback-model synthesis using the original question and NASA records", async () => {
  const question = "What does the supplied NASA record say about microgravity combustion?";
  const receivedPromptInputs = [];
  const result = await runGroundedResearchAssistant({ question }, assistantDependencies({
    generate: async (input) => runGeminiWithReliability({
      operation: "synthesis",
      models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
      policy,
      random: () => 0,
      sleep: async () => {},
      request: async (model) => {
        receivedPromptInputs.push({ model, question: input.question, sources: input.sources.map(({ record: sourceRecord }) => sourceRecord.id) });
        if (model === "gemini-3.6-flash") throw Object.assign(new Error("temporarily unavailable"), { status: 503 });
        return JSON.stringify(answer);
      },
    }),
  }));
  assert.equal(result.status, "answered");
  assert.equal(result.answer.findings[0].citations[0], "S1");
  assert.equal(result.sources[0].record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.deepEqual(receivedPromptInputs, [
    { model: "gemini-3.6-flash", question, sources: ["20150023100"] },
    { model: "gemini-3.6-flash", question, sources: ["20150023100"] },
    { model: "gemini-3.5-flash-lite", question, sources: ["20150023100"] },
  ]);
});

test("NASA records remain available without an AI answer when synthesis attempts fail", async () => {
  const result = await runGroundedResearchAssistant({ question: "What does the NASA abstract report?" }, assistantDependencies({
    generate: async () => runGeminiWithReliability({
      operation: "synthesis",
      models: [{ model: "gemini-3.6-flash", attempts: 2 }, { model: "gemini-3.5-flash-lite", attempts: 1 }],
      policy,
      random: () => 0,
      sleep: async () => {},
      request: async () => { throw Object.assign(new Error("temporarily unavailable"), { status: 503 }); },
    }),
    synthesisFailure: () => ({ code: "upstream", message: "Gemini is temporarily unavailable; retrieved NASA records are shown without an AI conclusion." }),
  }));
  assert.equal(result.status, "retrieved_only");
  assert.equal(result.sources[0].record.id, "20150023100");
  assert.equal(result.sources[0].record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.deepEqual(result.answer.findings, []);
  assert.match(result.evidenceNotice, /without an AI conclusion/i);
});
