import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser, type VerifiedUser } from "@/lib/server/auth-guard";

export async function WorkspaceShell({ children, currentUser }: { children: ReactNode; currentUser?: VerifiedUser | null }) {
  const user = currentUser === undefined
    ? await getVerifiedUser(await createServerClient())
    : currentUser;
  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}
