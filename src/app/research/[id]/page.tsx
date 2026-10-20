import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResearchDetail } from "@/components/research-detail";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";

export const metadata: Metadata = { title: "NASA research record" };
export const dynamic = "force-dynamic";

export default async function ResearchRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  let accountState: "signed-in" | "signed-out" | "unavailable" = user ? "unavailable" : "signed-out";
  let initialSaved = false;
  if (user) {
    const { data, error } = await client.from("saved_papers").select("id").eq("nasa_id", id).maybeSingle();
    accountState = error ? "unavailable" : "signed-in";
    initialSaved = !!data && !error;
  }
  return (
    <WorkspaceShell currentUser={user}>
      <ResearchDetail id={id} accountState={accountState} initialSaved={initialSaved} />
    </WorkspaceShell>
  );
}
