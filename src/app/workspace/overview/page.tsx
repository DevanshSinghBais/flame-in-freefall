import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResearchSearch } from "@/components/research-search";
import { FlameComparison } from "@/components/flame-comparison";
import { nasaFlameComparisonSource } from "@/lib/research";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "Research overview" };
export const dynamic = "force-dynamic";

export default async function ResearchOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const param = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  const initialQuery = param("q").slice(0, 300) || "microgravity combustion";
  const initialFilters = { stiType: param("stiType"), center: param("center"), subjectCategory: param("subjectCategory") };
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  let personalCounts: { papers: number; collections: number } | null = null;
  let personalDataUnavailable = false;
  if (user) {
    const [papers, collections] = await Promise.all([
      client.from("saved_papers").select("id", { count: "exact", head: true }),
      client.from("research_collections").select("id", { count: "exact", head: true }),
    ]);
    if (!papers.error && !collections.error) {
      personalCounts = { papers: papers.count ?? 0, collections: collections.count ?? 0 };
    } else {
      personalDataUnavailable = true;
    }
  }

  return (
    <WorkspaceShell currentUser={user}>
      <div className="workspace-heading overview-header">
        <span className="overview-orbit-scene" aria-hidden="true" />
        <div>
          <p className="eyebrow">EXPLORING COMBUSTION BEYOND EARTH</p>
          <h1>Research overview</h1>
          <p className="workspace-lede">Discover and compare traceable source material on combustion beyond Earth.</p>
        </div>
        <span className="workspace-scope"><span aria-hidden="true" /> NASA NTRS · LIVE</span>
      </div>

      {user && (
        <section className="overview-personal-snapshot" aria-label="Your private research">
          {personalCounts ? <>
            <Link href="/workspace/paper-library"><span>Saved papers</span><strong>{personalCounts.papers.toLocaleString()}</strong></Link>
            <Link href="/workspace/collections"><span>Collections</span><strong>{personalCounts.collections.toLocaleString()}</strong></Link>
            <span className="overview-personal-note">Private to your account</span>
          </> : <p role="status">{personalDataUnavailable ? "Your private library totals are unavailable until the database is ready." : "Your private research totals are loading."} <Link href="/workspace/paper-library">Open Paper Library</Link></p>}
        </section>
      )}

      <ResearchSearch initialQuery={initialQuery} initialFilters={initialFilters} variant="overview" isAuthenticated={!!user} />

      <section className="overview-comparison-layout" aria-label="Flame comparison and evidence">
        <FlameComparison compact title="Flame morphology comparison" />
        <aside className="overview-evidence-stack" aria-label="Evidence and interpretation">
          <article className="evidence-panel">
            <span className="semantic-marker" aria-hidden="true" />
            <div>
              <p className="semantic-label">PUBLISHED EVIDENCE</p>
              <h3>NASA source image</h3>
              <p>NASA’s ACME image description identifies a teardrop-shaped candle flame on Earth and a spherical, soot-free blue flame in microgravity.</p>
              <a href={nasaFlameComparisonSource} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
          </article>
          <article className="interpretation-panel">
            <span className="semantic-marker" aria-hidden="true" />
            <div>
              <p className="semantic-label">AI INTERPRETATION</p>
              <h3>Source-grounded synthesis</h3>
              <p>The assistant keeps generated analysis separate from source wording and links material claims to the NASA records retrieved for each question.</p>
              <Link href="/workspace/ai-research-assistant">Open the research assistant <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </article>
        </aside>
      </section>
      <p className="workspace-disclaimer">Search results are live records returned by NASA NTRS. The NASA comparison photograph is source imagery, not a measured plot or a substitute for the linked research record.</p>
    </WorkspaceShell>
  );
}
