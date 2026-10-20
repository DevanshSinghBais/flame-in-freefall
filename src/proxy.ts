import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  // Proxy refreshes cookies; every private page and data route still verifies
  // claims independently and relies on database RLS for row authorization.
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/research/:path*",
    "/api/library/:path*",
    "/api/research/assistant",
    "/api/collections/:path*",
    "/api/notes/:path*",
    "/api/saved-searches/:path*",
    "/api/account/:path*",
    "/auth/callback",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ],
};
