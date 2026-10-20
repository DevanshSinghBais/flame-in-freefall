import test from "node:test";
import assert from "node:assert/strict";
import {
  NtrsProviderError,
  buildNtrsSearchUrl,
  getNtrsCitation,
  normalizeNtrsCitation,
  normalizeNtrsSearchResponse,
  searchNtrs,
} from "../src/lib/ntrs-provider-core.ts";

const input = { query: "microgravity combustion", page: 2, pageSize: 10 };

function citation(overrides = {}) {
  return {
    id: 20150023100,
    title: "NASA Microgravity Combustion Program",
    abstract: "Source abstract text.",
    stiTypeDetails: "Presentation",
    authorAffiliations: [{ meta: { author: { name: "Urban, David L." } } }],
    publications: [{ publicationDate: "2015-10-20T00:00:00.0000000+00:00", doi: "10.1234/example" }],
    center: { name: "Glenn Research Center" },
    subjectCategories: ["Propellants And Fuels"],
    downloads: [{ links: { pdf: "/api/citations/20150023100/downloads/20150023100.pdf", fulltext: "/api/citations/20150023100/downloads/20150023100.txt" } }],
    ...overrides,
  };
}

function response(body, status = 200, headers = { "content-type": "application/json" }) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
}

test("normalizes real provider fields and preserves stable NASA source id and canonical URL", () => {
  const record = normalizeNtrsCitation(citation());
  assert.equal(record.id, "20150023100");
  assert.equal(record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  assert.equal(record.title, "NASA Microgravity Combustion Program");
  assert.equal(record.authors[0], "Urban, David L.");
  assert.equal(record.publicationDate, "2015-10-20T00:00:00.0000000+00:00");
  assert.equal(record.doi, "10.1234/example");
  assert.equal(record.fullTextLinks.length, 2);
});

test("missing optional metadata stays absent and unsafe download URLs are omitted", () => {
  const record = normalizeNtrsCitation({
    id: "19970020547",
    title: "A traceable record",
    downloads: [{ links: { pdf: "https://example.com/fake.pdf", fulltext: "/api/citations/999/downloads/other.pdf" } }],
  });
  assert.equal(record.id, "19970020547");
  assert.equal(record.abstract, undefined);
  assert.equal(record.publicationDate, undefined);
  assert.equal(record.doi, undefined);
  assert.deepEqual(record.authors, []);
  assert.deepEqual(record.fullTextLinks, []);
});

test("source DOI resolver URLs are preserved as source-provided metadata", () => {
  const record = normalizeNtrsCitation({
    id: 20200000557,
    title: "A traceable record",
    publications: [{ doi: "https://doi.org/10.1016/j.combustflame.2018.10.016 " }],
  });
  assert.equal(record.doi, "https://doi.org/10.1016/j.combustflame.2018.10.016");
});

test("search normalization reads provider total, estimate flag, facets and skips malformed records", () => {
  const result = normalizeNtrsSearchResponse({
    stats: { total: 11, estimate: false },
    results: [citation(), { id: "bad", title: "Malformed" }],
    aggregations: {
      stiType: { buckets: [{ key: "PRESENTATION", doc_count: 4 }] },
      center: { buckets: [{ key: "GRC", doc_count: 9 }] },
      subjectCategory: { buckets: [{ key: "Propellants And Fuels", doc_count: 7 }] },
    },
  }, input);
  assert.equal(result.total, 11);
  assert.equal(result.totalIsEstimate, false);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 10);
  assert.equal(result.results.length, 1);
  assert.equal(result.partial, true);
  assert.equal(result.skippedRecords, 1);
  assert.equal(result.facets.centers[0].value, "GRC");
});

test("empty search queries are rejected before fetch", async () => {
  let called = false;
  await assert.rejects(
    searchNtrs({ ...input, query: "   " }, { fetcher: async () => { called = true; return response({}); } }),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed",
  );
  assert.equal(called, false);
});

test("valid search query uses fixed NASA endpoint and documented query and pagination parameters", async () => {
  let requestedUrl;
  const fetcher = async (url) => {
    requestedUrl = new URL(url);
    return response({ stats: { total: 1, estimate: false }, results: [citation()], aggregations: {} });
  };
  const result = await searchNtrs({ query: "flame spread", page: 1, pageSize: 10, center: "GRC" }, { fetcher });
  assert.equal(requestedUrl.origin, "https://ntrs.nasa.gov");
  assert.equal(requestedUrl.pathname, "/api/citations/search");
  assert.equal(requestedUrl.searchParams.get("q"), "flame spread");
  assert.equal(requestedUrl.searchParams.get("page.size"), "10");
  assert.equal(requestedUrl.searchParams.get("page.from"), "0");
  assert.equal(requestedUrl.searchParams.get("center"), "GRC");
  assert.equal(result.results[0].id, "20150023100");
});

test("pagination translates one-based application pages to NTRS zero-based offsets", () => {
  const url = buildNtrsSearchUrl({ ...input, subjectCategory: "Space Transportation And Safety" });
  assert.equal(url.searchParams.get("page.from"), "10");
  assert.equal(url.searchParams.get("page.size"), "10");
  assert.equal(url.searchParams.get("subjectCategory"), "Space Transportation And Safety");
});

test("upstream HTTP errors and timeouts are classified without exposing provider payloads", async () => {
  await assert.rejects(searchNtrs({ ...input, page: 1 }, { fetcher: async () => response({ message: "internal" }, 503) }),
    (error) => error instanceof NtrsProviderError && error.kind === "upstream" && error.upstreamStatus === 503);
  await assert.rejects(searchNtrs({ ...input, page: 1 }, { fetcher: async () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); } }),
    (error) => error instanceof NtrsProviderError && error.kind === "timeout");
});

test("malformed content and malformed response schemas fail explicitly", async () => {
  await assert.rejects(searchNtrs({ ...input, page: 1 }, { fetcher: async () => response("<html>unavailable</html>", 200, { "content-type": "text/html" }) }),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed");
  await assert.rejects(searchNtrs({ ...input, page: 1 }, { fetcher: async () => response("not-json") }),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed");
  assert.throws(() => normalizeNtrsSearchResponse({ results: [] }, input),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed");
});

test("detail request uses provider id and rejects mismatched returned identifiers", async () => {
  let requestedUrl;
  const record = await getNtrsCitation("20150023100", { fetcher: async (url) => { requestedUrl = new URL(url); return response(citation()); } });
  assert.equal(requestedUrl.pathname, "/api/citations/20150023100");
  assert.equal(record.canonicalUrl, "https://ntrs.nasa.gov/citations/20150023100");
  await assert.rejects(getNtrsCitation("20150023100", { fetcher: async () => response(citation({ id: 123 })) }),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed");
  await assert.rejects(getNtrsCitation("abc", { fetcher: async () => response(citation()) }),
    (error) => error instanceof NtrsProviderError && error.kind === "malformed");
});

test("detail 404 is reported as not found", async () => {
  await assert.rejects(getNtrsCitation("999999999999", { fetcher: async () => response({ statusCode: 404, message: "Not Found" }, 404) }),
    (error) => error instanceof NtrsProviderError && error.kind === "not-found");
});
