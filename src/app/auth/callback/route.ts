import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/validation";
import { completeAuthCallback } from "@/lib/auth/callback-core";
import { classifySupabaseAuthError, logAuthDiagnostic } from "@/lib/auth/diagnostics";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"), "/auth/verified");
  const callbackError = (kind = "callback") => {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("error", kind);
    return NextResponse.redirect(url);
  };

  if (request.nextUrl.searchParams.get("error")) return callbackError("oauth");

  try {
    const client = await createServerClient();
    const outcome = await completeAuthCallback(
      code,
      async (authCode) => {
        const { data, error } = await client.auth.exchangeCodeForSession(authCode);
        return { error, hasSession: !!data.session, userId: data.user?.id ?? null };
      },
      async () => {
        const { data, error } = await client.auth.getClaims();
        if (error) throw error;
        return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
      },
      (error) => classifySupabaseAuthError(error, "email_callback"),
    );

    if (!outcome.ok) {
      logAuthDiagnostic("email_callback", "exchange_or_session", outcome.diagnostic);
      return callbackError();
    }
    logAuthDiagnostic("email_callback", "session_verified_before_redirect", { category: "success", code: null, httpStatus: null });
  } catch (error) {
    logAuthDiagnostic("email_callback", "callback_exception", classifySupabaseAuthError(error, "email_callback"));
    return callbackError();
  }

  return NextResponse.redirect(new URL(next, request.url));
}
