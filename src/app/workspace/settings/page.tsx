import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AccountSettingsClient } from "@/components/account-settings-client";
import { requireUser } from "@/lib/server/require-user";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { client, user } = await requireUser("/workspace/settings");
  const [{ data: authResult }, { data: profile }] = await Promise.all([
    client.auth.getUser(),
    client.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const verifiedEmail = !!authResult.user?.email_confirmed_at;
  const status = (await searchParams).status;
  const statusMessage = status === "password-updated"
    ? "Your password was updated."
    : status === "email-updated"
      ? "Your email change was confirmed."
      : undefined;
  const displayName = profile?.display_name ?? (typeof authResult.user?.user_metadata.display_name === "string" ? authResult.user.user_metadata.display_name : "");
  return <AppShell userEmail={user.email ?? authResult.user?.email ?? ""}><AccountSettingsClient email={authResult.user?.email ?? user.email ?? ""} displayName={displayName} emailVerified={verifiedEmail} statusMessage={statusMessage} /></AppShell>;
}
