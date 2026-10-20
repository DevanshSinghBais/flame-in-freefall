import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  refreshSessionWithFactory,
  type SessionClientFactory,
  type SessionCookieAdapter,
} from "@/lib/supabase/session-core";

const makeSupabaseClient: SessionClientFactory = (cookies: SessionCookieAdapter) => {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createServerClient<Database>(url, publishableKey, { cookies }) as unknown as ReturnType<SessionClientFactory>;
};

export function refreshSupabaseSession(request: NextRequest) {
  return refreshSessionWithFactory(request, makeSupabaseClient);
}
