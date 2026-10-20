/**
 * NASA NTRS provider contract used by the application.
 *
 * Search pagination uses NTRS's documented `page.size` and `page.from`
 * parameters (zero-based offset). `stats.total` is the provider result count;
 * `stats.estimate` indicates whether that count is estimated.
 */
export const NTRS_API_ORIGIN = "https://ntrs.nasa.gov";
export const NTRS_CANONICAL_ORIGIN = "https://ntrs.nasa.gov";
export const NTRS_MAX_RESULTS = 10_000;
export const NTRS_MAX_PAGE_SIZE = 100;
export const NTRS_REQUEST_TIMEOUT_MS = 8_000;

export type NtrsFacet = { value: string; count?: number };

export type NtrsRecord = {
  /** Stable numeric NASA Technical Reports Server citation identifier. */
  id: string;
  /** Canonical NASA citation page derived from that provider identifier. */
  canonicalUrl: string;
  title: string;
  abstract?: string;
  authors: string[];
  publicationDate?: string;
  doi?: string;
  documentType?: string;
  center?: string;
  subjectCategories: string[];
  fullTextLinks: Array<{ label: string; url: string }>;
};

export type NtrsSearchInput = {
  query: string;
  page: number;
  pageSize: number;
  stiType?: string;
  center?: string;
  subjectCategory?: string;
};

export type NtrsSearchResult = {
  query: string;
  page: number;
  pageSize: number;
  total: number;
  totalIsEstimate: boolean;
  results: NtrsRecord[];
  facets: {
    stiTypes: NtrsFacet[];
    centers: NtrsFacet[];
    subjectCategories: NtrsFacet[];
  };
  /** True when one or more individual records or optional facets were malformed. */
  partial: boolean;
  skippedRecords: number;
};

export class NtrsProviderError extends Error {
  readonly kind: "timeout" | "upstream" | "malformed" | "not-found";
  readonly upstreamStatus?: number;

  constructor(
    message: string,
    kind: "timeout" | "upstream" | "malformed" | "not-found",
    upstreamStatus?: number,
  ) {
    super(message);
    this.name = "NtrsProviderError";
    this.kind = kind;
    this.upstreamStatus = upstreamStatus;
  }
}

type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function providerId(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0) return value;
  return undefined;
}

function readAuthors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isObject(entry) || !isObject(entry.meta) || !isObject(entry.meta.author)) return [];
    const name = nonEmptyString(entry.meta.author.name);
    return name ? [name] : [];
  });
}

function readPublications(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function safeNtrsDownloadUrl(value: unknown, citationId: string): string | undefined {
  const path = nonEmptyString(value);
  if (!path) return undefined;
  try {
    const url = new URL(path, NTRS_API_ORIGIN);
    if (url.origin !== NTRS_API_ORIGIN) return undefined;
    if (!url.pathname.startsWith(`/api/citations/${citationId}/downloads/`)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function readDownloads(value: unknown, citationId: string): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];
  const links: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isObject(entry) || !isObject(entry.links)) continue;
    const candidates: Array<[string, unknown]> = [
      ["PDF", entry.links.pdf],
      ["Full text", entry.links.fulltext],
      ["Original file", entry.links.original],
    ];
    for (const [label, candidate] of candidates) {
      const url = safeNtrsDownloadUrl(candidate, citationId);
      if (url && !seen.has(url)) {
        links.push({ label, url });
        seen.add(url);
      }
    }
  }
  return links;
}

export function normalizeNtrsCitation(value: unknown): NtrsRecord | null {
  if (!isObject(value)) return null;
  const id = providerId(value.id);
  const title = nonEmptyString(value.title);
  if (!id || !title) return null;

  const publications = readPublications(value.publications);
  const publicationDate = publications
    .map((publication) => nonEmptyString(publication.publicationDate))
    .find(Boolean);
  const doi = publications.map((publication) => nonEmptyString(publication.doi)).find(Boolean);
  const center = isObject(value.center) ? nonEmptyString(value.center.name) : undefined;
  const subjectCategories = Array.isArray(value.subjectCategories)
    ? value.subjectCategories.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim())
    : [];

  return {
    id,
    canonicalUrl: `${NTRS_CANONICAL_ORIGIN}/citations/${encodeURIComponent(id)}`,
    title,
    ...(nonEmptyString(value.abstract) ? { abstract: nonEmptyString(value.abstract) } : {}),
    authors: readAuthors(value.authorAffiliations),
    ...(publicationDate ? { publicationDate } : {}),
    ...(doi ? { doi } : {}),
    ...(nonEmptyString(value.stiTypeDetails) ? { documentType: nonEmptyString(value.stiTypeDetails) } : {}),
    ...(center ? { center } : {}),
    subjectCategories,
    fullTextLinks: readDownloads(value.downloads, id),
  };
}

function readFacets(value: unknown): { facets: NtrsFacet[]; malformed: boolean } {
  if (!isObject(value) || !Array.isArray(value.buckets)) return { facets: [], malformed: value !== undefined };
  let malformed = false;
  const facets = value.buckets.flatMap((bucket) => {
    if (!isObject(bucket) || typeof bucket.key !== "string" || !bucket.key.trim()) {
      malformed = true;
      return [];
    }
    const count = typeof bucket.doc_count === "number" && Number.isFinite(bucket.doc_count) && bucket.doc_count >= 0
      ? bucket.doc_count
      : undefined;
    return [{ value: bucket.key.trim(), ...(count !== undefined ? { count } : {}) }];
  });
  return { facets, malformed };
}

export function normalizeNtrsSearchResponse(value: unknown, input: NtrsSearchInput): NtrsSearchResult {
  if (!isObject(value) || !isObject(value.stats) || !Array.isArray(value.results)) {
    throw new NtrsProviderError("NASA NTRS returned an invalid search response.", "malformed");
  }
  const total = value.stats.total;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
    throw new NtrsProviderError("NASA NTRS did not return a valid result count.", "malformed");
  }

  const results: NtrsRecord[] = [];
  let skippedRecords = 0;
  for (const rawRecord of value.results) {
    const record = normalizeNtrsCitation(rawRecord);
    if (record) results.push(record);
    else skippedRecords += 1;
  }

  const aggregations = isObject(value.aggregations) ? value.aggregations : undefined;
  const sti = readFacets(aggregations?.stiType);
  const centers = readFacets(aggregations?.center);
  const subjects = readFacets(aggregations?.subjectCategory);
  const expectedEstimate = value.stats.estimate;

  return {
    query: input.query,
    page: input.page,
    pageSize: input.pageSize,
    total,
    // Without the documented boolean, never present an unknown count as exact.
    totalIsEstimate: typeof expectedEstimate === "boolean" ? expectedEstimate : true,
    results,
    facets: { stiTypes: sti.facets, centers: centers.facets, subjectCategories: subjects.facets },
    partial: skippedRecords > 0 || sti.malformed || centers.malformed || subjects.malformed,
    skippedRecords,
  };
}

export function buildNtrsSearchUrl(input: NtrsSearchInput): URL {
  const url = new URL("/api/citations/search", NTRS_API_ORIGIN);
  url.searchParams.set("q", input.query);
  url.searchParams.set("page.size", String(input.pageSize));
  url.searchParams.set("page.from", String((input.page - 1) * input.pageSize));
  if (input.stiType) url.searchParams.set("stiType", input.stiType);
  if (input.center) url.searchParams.set("center", input.center);
  if (input.subjectCategory) url.searchParams.set("subjectCategory", input.subjectCategory);
  return url;
}

async function getJson(fetcher: FetchLike, url: URL, timeoutMs: number): Promise<unknown> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
      next: { revalidate: 120 },
    } as RequestInit & { next: { revalidate: number } });
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new NtrsProviderError("NASA NTRS did not respond before the request timed out.", "timeout");
    }
    throw new NtrsProviderError("NASA NTRS could not be reached.", "upstream");
  }

  if (response.status === 404) throw new NtrsProviderError("NASA NTRS could not find this citation.", "not-found", 404);
  if (!response.ok) throw new NtrsProviderError("NASA NTRS returned an upstream error.", "upstream", response.status);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new NtrsProviderError("NASA NTRS returned a non-JSON response.", "malformed", response.status);
  }
  try {
    return await response.json();
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new NtrsProviderError("NASA NTRS did not respond before the request timed out.", "timeout");
    }
    throw new NtrsProviderError("NASA NTRS returned malformed JSON.", "malformed", response.status);
  }
}

function validateInput(input: NtrsSearchInput): void {
  if (!input.query.trim() || input.query.length > 300) throw new NtrsProviderError("A non-empty search query is required.", "malformed");
  if (!Number.isInteger(input.page) || input.page < 1 || !Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > NTRS_MAX_PAGE_SIZE) {
    throw new NtrsProviderError("The requested NASA NTRS page is invalid.", "malformed");
  }
  if ((input.page - 1) * input.pageSize >= NTRS_MAX_RESULTS) {
    throw new NtrsProviderError("NASA NTRS cannot return pages beyond its 10,000-result search window.", "malformed");
  }
}

export async function searchNtrs(input: NtrsSearchInput, options: { fetcher?: FetchLike; timeoutMs?: number } = {}): Promise<NtrsSearchResult> {
  validateInput(input);
  const payload = await getJson(options.fetcher ?? fetch, buildNtrsSearchUrl(input), options.timeoutMs ?? NTRS_REQUEST_TIMEOUT_MS);
  return normalizeNtrsSearchResponse(payload, input);
}

export async function getNtrsCitation(id: string, options: { fetcher?: FetchLike; timeoutMs?: number } = {}): Promise<NtrsRecord> {
  if (!/^\d{1,20}$/.test(id) || Number(id) <= 0) {
    throw new NtrsProviderError("The NASA citation identifier is invalid.", "malformed");
  }
  const url = new URL(`/api/citations/${encodeURIComponent(id)}`, NTRS_API_ORIGIN);
  const payload = await getJson(options.fetcher ?? fetch, url, options.timeoutMs ?? NTRS_REQUEST_TIMEOUT_MS);
  const record = normalizeNtrsCitation(payload);
  if (!record || record.id !== id) {
    throw new NtrsProviderError("NASA NTRS returned an invalid citation record.", "malformed");
  }
  return record;
}
