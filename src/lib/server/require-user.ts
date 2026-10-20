import "server-only";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";
import { logAuthDiagnostic } from "@/lib/auth/diagnostics";

export async function requireUser(returnTo: string) {
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  if (!user) {
    logAuthDiagnostic("protected_route", "session_not_verified", { category: "session_not_visible", code: null, httpStatus: null });
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return { client, user };
}
