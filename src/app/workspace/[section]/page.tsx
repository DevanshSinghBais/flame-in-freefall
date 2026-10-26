import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AiResearchAssistantWorkspace, ExperimentComparisonWorkspace, ResearchCorpusWorkspace, ScenarioExplorerWorkspace } from "@/components/research-workspace-tools";
import { ResearchReportClient } from "@/components/research-report-client";
import { FireSimulationWorkspace } from "@/components/fire-simulation";
import { requireUser } from "@/lib/server/require-user";
import { isGeminiConfigured } from "@/lib/server/gemini-provider";
import { isOllamaConfigured } from "@/lib/server/ollama-provider";
import { destinations } from "@/lib/workspace-navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const destination = destinations.find((item) => item.slug === section);
  return { title: destination?.label ?? "Workspace" };
}

function PageHeader({ title, description, eyebrow = "FLAME IN FREEFALL · RESEARCH WORKSPACE", scope }: {
  title: string;
  description: string;
  eyebrow?: string;
  scope?: string;
}) {
  return <div className="workspace-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="workspace-lede">{description}</p></div>{scope && <span className="workspace-scope"><span aria-hidden="true" /> {scope}</span>}</div>;
}

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  if (section === "ai-research-assistant") {
    await requireUser("/workspace/ai-research-assistant");
    return <WorkspaceShell><PageHeader title="AI Research Assistant" description="Ask a research question, retrieve real NASA NTRS records, and review a source-grounded synthesis." scope="LIVE NTRS · AI + LOCAL FALLBACK" /><AiResearchAssistantWorkspace synthesisAvailable={isGeminiConfigured() || isOllamaConfigured()} /></WorkspaceShell>;
  }
  if (section === "experiment-comparison") return <WorkspaceShell><PageHeader title="Evidence Matrix" description="Line up NASA records side by side and see where their source metadata agrees, differs, or is missing." scope="SOURCE-LINKED" /><ExperimentComparisonWorkspace /></WorkspaceShell>;
  if (section === "scenario-explorer") return <WorkspaceShell><PageHeader title="Scenario Lab" description="Build a transparent combustion scenario fingerprint, then connect its vocabulary to real NASA source records." scope="SCENARIO → EVIDENCE" /><ScenarioExplorerWorkspace /></WorkspaceShell>;
  if (section === "fire-simulation") return <WorkspaceShell><PageHeader title="Fire Simulation" description="Explore how selected gravity, mixture, and flow conditions change an illustrative flame morphology." scope="INTERACTIVE MODEL" /><FireSimulationWorkspace /></WorkspaceShell>;
  if (section === "evidence-gaps") return <WorkspaceShell><PageHeader title="Evidence Gaps" description="Inspect the metadata returned for a bounded NASA NTRS query and see what this response does not contain." scope="QUERY COVERAGE" /><ResearchCorpusWorkspace mode="gaps" /></WorkspaceShell>;
  if (section === "scientific-analytics") return <WorkspaceShell><PageHeader title="Research Landscape" description="Read the publication pulse behind a NASA query: timeline, institutions, subjects, and source access at a glance." scope="NTRS LANDSCAPE" /><ResearchCorpusWorkspace mode="analytics" /></WorkspaceShell>;

  if (section === "reports") {
    const { client, user } = await requireUser("/workspace/reports");
    const { data: papers, error: paperError } = await client.from("saved_papers").select("*").order("updated_at", { ascending: false });
    if (paperError) return <AppShell userEmail={user.email}><div className="personal-page"><PageHeader title="Reports" description="Create a source-linked export from your private research." scope="PRIVATE" /><div className="personal-error" role="alert"><h2>Your Paper Library could not be loaded</h2><p>Apply the existing user research-data migration and try again. No report was generated.</p></div></div></AppShell>;
    const paperIds = (papers ?? []).map((paper) => paper.id);
    const noteResult = paperIds.length
      ? await client.from("personal_notes").select("saved_paper_id,content").in("saved_paper_id", paperIds)
      : { data: [] as Array<{ saved_paper_id: string; content: string }>, error: null };
    if (noteResult.error) return <AppShell userEmail={user.email}><div className="personal-page"><PageHeader title="Reports" description="Create a source-linked export from your private research." scope="PRIVATE" /><div className="personal-error" role="alert"><h2>Your private notes could not be loaded</h2><p>Try again. No report was generated.</p></div></div></AppShell>;
    const notes = Object.fromEntries((noteResult.data ?? []).map((note) => [note.saved_paper_id, note.content]));
    return <AppShell userEmail={user.email}><ResearchReportClient papers={papers ?? []} notes={notes} /></AppShell>;
  }

  if (section === "overview" || section === "research-explorer" || section === "paper-library" || section === "collections" || section === "settings") notFound();
  notFound();
}
