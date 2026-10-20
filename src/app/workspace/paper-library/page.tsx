import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PaperLibraryClient } from "@/components/paper-library-client";
import { requireUser } from "@/lib/server/require-user";

export const metadata: Metadata = { title: "Paper Library" };
export const dynamic = "force-dynamic";

export default async function PaperLibraryPage() {
  const { client, user } = await requireUser("/workspace/paper-library");
  const { data: papers, error } = await client.from("saved_papers").select("*").order("updated_at", { ascending: false });
  if (error) {
    return <AppShell userEmail={user.email}><div className="personal-page"><header className="workspace-heading"><div><p className="eyebrow">FLAME IN FREEFALL · PRIVATE RESEARCH</p><h1>Paper Library</h1></div></header><div className="personal-error" role="alert"><h2>Personal library is not ready</h2><p>Apply <code>supabase/migrations/20261019000100_user_research_data.sql</code> to the Supabase project, then reload.</p><Link className="quiet-button" href="/workspace/overview">Return to public research search</Link></div></div></AppShell>;
  }

  const paperIds = (papers ?? []).map((paper) => paper.id);
  const [noteResult, searchResult] = paperIds.length
    ? await Promise.all([
      client.from("personal_notes").select("saved_paper_id,content").in("saved_paper_id", paperIds),
      client.from("saved_searches").select("*").order("created_at", { ascending: false }),
    ])
    : await Promise.all([
      Promise.resolve({ data: [] as Array<{ saved_paper_id: string; content: string }>, error: null }),
      client.from("saved_searches").select("*").order("created_at", { ascending: false }),
    ]);
  if (noteResult.error || searchResult.error) {
    return <AppShell userEmail={user.email}><div className="personal-error" role="alert"><h2>Library data could not be loaded</h2><p>Try again. If the migration was just applied, refresh the Supabase API schema cache.</p></div></AppShell>;
  }
  const notes = Object.fromEntries((noteResult.data ?? []).map((note) => [note.saved_paper_id, note.content]));
  return <AppShell userEmail={user.email}><PaperLibraryClient papers={papers ?? []} notes={notes} searches={searchResult.data ?? []} email={user.email} /></AppShell>;
}
