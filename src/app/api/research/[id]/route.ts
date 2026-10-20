import { NextRequest, NextResponse } from "next/server";
import { getNtrsCitation, NtrsProviderError } from "@/lib/server/ntrs-provider";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id) || Number(id) <= 0) {
    return NextResponse.json({ error: { code: "invalid_id", message: "This NASA citation identifier is not valid." } }, { status: 400 });
  }
  try {
    const citation = await getNtrsCitation(id);
    return NextResponse.json(citation, { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    if (error instanceof NtrsProviderError && error.kind === "not-found") {
      return NextResponse.json({ error: { code: "not_found", message: "NASA NTRS does not have a record for this citation identifier." } }, { status: 404 });
    }
    const timeout = error instanceof NtrsProviderError && error.kind === "timeout";
    const status = timeout ? 504 : error instanceof NtrsProviderError && error.kind === "malformed" ? 502 : 502;
    const message = timeout
      ? "NASA NTRS is taking too long to respond. Please try again."
      : "NASA NTRS could not load this record. Please try again shortly.";
    return NextResponse.json({ error: { code: timeout ? "timeout" : "upstream", message } }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
