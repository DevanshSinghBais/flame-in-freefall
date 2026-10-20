import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CollectionsClient } from "@/components/collections-client";
import { requireUser } from "@/lib/server/require-user";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { user } = await requireUser("/workspace/collections");
  return <AppShell userEmail={user.email}><CollectionsClient /></AppShell>;
}
