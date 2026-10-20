import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CollectionDetailClient } from "@/components/collection-detail-client";
import { requireUser } from "@/lib/server/require-user";

export const metadata: Metadata = { title: "Research collection" };
export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser(`/workspace/collections/${encodeURIComponent(id)}`);
  return <AppShell userEmail={user.email}><CollectionDetailClient id={id} /></AppShell>;
}
