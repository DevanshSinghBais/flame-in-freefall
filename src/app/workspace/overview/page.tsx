import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResearchOverviewBrief } from "@/components/research-overview-brief";

export const metadata: Metadata = { title: "Research overview" };
export const dynamic = "force-dynamic";

export default async function ResearchOverviewPage() {
  return (
    <WorkspaceShell>
      <ResearchOverviewBrief />
    </WorkspaceShell>
  );
}
