import "server-only";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";

export async function requireApiUser() {
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: { code: "unauthorized", message: "Sign in to use personal research features." } }, {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      }),
    };
  }
  return { ok: true as const, client, user };
}

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function databaseUnavailable() {
  return privateJson({ error: { code: "database_unavailable", message: "Personal research storage is not ready. Apply the versioned Supabase migration and try again." } }, 503);
}

export function databaseError(error: { code?: string } | null) {
  if (error && ["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"].includes(error.code ?? "")) return databaseUnavailable();
  return privateJson({ error: { code: "database_error", message: "This personal research operation could not be completed. Try again." } }, 500);
}
