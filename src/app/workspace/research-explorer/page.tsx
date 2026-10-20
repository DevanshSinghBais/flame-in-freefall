import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResearchSearch } from "@/components/research-search";
import { getVerifiedUser } from "@/lib/server/auth-guard";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Research Explorer" };
export const dynamic = "force-dynamic";

export default async function ResearchExplorerPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const param = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  const initialQuery = param("q").slice(0, 300) || "microgravity combustion";
  const initialFilters = { stiType: param("stiType"), center: param("center"), subjectCategory: param("subjectCategory") };
  const user = await getVerifiedUser(await createServerClient());

  return (
    <WorkspaceShell currentUser={user}>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">NASA TECHNICAL REPORTS SERVER</p>
          <h1>Research Explorer</h1>
          <p className="workspace-lede">Search live NASA publication records, refine the returned metadata, and open traceable source details.</p>
        </div>
        <span className="workspace-scope"><span aria-hidden="true" /> LIVE SOURCE</span>
      </div>
      <ResearchSearch initialQuery={initialQuery} initialFilters={initialFilters} variant="explorer" isAuthenticated={!!user} />
      <p className="workspace-disclaimer">Record titles, abstracts, authors, dates, and identifiers are displayed only when returned by NASA NTRS. Search coverage is limited to the source response for the query above.</p>
    </WorkspaceShell>
  );
}
