import { NextRequest, NextResponse } from "next/server";
import { NtrsProviderError, NTRS_MAX_PAGE_SIZE, NTRS_MAX_RESULTS, searchNtrs } from "@/lib/server/ntrs-provider";

const FILTER_VALUE = /^[\p{L}\p{N} _.,/&()'-]{1,120}$/u;
const DEFAULT_PAGE_SIZE = 10;

function errorResponse(error: unknown): NextResponse {
  if (error instanceof NtrsProviderError) {
    const status = error.kind === "malformed" ? 400 : error.kind === "timeout" ? 504 : error.kind === "not-found" ? 404 : 502;
    const message = error.kind === "timeout"
      ? "NASA NTRS is taking too long to respond. Please try again."
      : error.kind === "malformed"
        ? error.message
        : "NASA NTRS is temporarily unavailable. Please try again shortly.";
    return NextResponse.json({ error: { code: error.kind, message } }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: { code: "upstream", message: "NASA NTRS is temporarily unavailable. Please try again shortly." } }, { status: 502, headers: { "Cache-Control": "no-store" } });
}

function parseInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim();
  if (!query) return NextResponse.json({ error: { code: "invalid_query", message: "Enter a search term to find NASA research." } }, { status: 400 });
  if (query.length > 300) return NextResponse.json({ error: { code: "invalid_query", message: "Search terms must be 300 characters or fewer." } }, { status: 400 });

  const page = parseInteger(params.get("page"), 1);
  const pageSize = parseInteger(params.get("pageSize"), DEFAULT_PAGE_SIZE);
  if (page === null || page < 1 || pageSize === null || pageSize < 1 || pageSize > NTRS_MAX_PAGE_SIZE) {
    return NextResponse.json({ error: { code: "invalid_pagination", message: "The requested results page is invalid." } }, { status: 400 });
  }
  if ((page - 1) * pageSize >= NTRS_MAX_RESULTS) {
    return NextResponse.json({ error: { code: "result_window_exceeded", message: "NASA NTRS limits a search to its first 10,000 records." } }, { status: 400 });
  }

  const filterValues: Record<string, string | undefined> = {};
  for (const key of ["stiType", "center", "subjectCategory"] as const) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (!FILTER_VALUE.test(value)) {
      return NextResponse.json({ error: { code: "invalid_filter", message: "One or more research filters are invalid." } }, { status: 400 });
    }
    filterValues[key] = value;
  }

  try {
    const result = await searchNtrs({ query, page, pageSize, ...filterValues });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
