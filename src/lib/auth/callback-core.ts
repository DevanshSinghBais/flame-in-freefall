import type { AuthDiagnostic } from "./diagnostics";

export type AuthCallbackExchange = {
  error: unknown | null;
  hasSession: boolean;
  userId: string | null;
};

export type AuthCallbackOutcome = { ok: true } | { ok: false; diagnostic: AuthDiagnostic };
export type AuthErrorClassifier = (error: unknown) => AuthDiagnostic;

export async function completeAuthCallback(
  code: string | null,
  exchange: (code: string) => Promise<AuthCallbackExchange>,
  readSessionUserId: () => Promise<string | null>,
  classifyFailure: AuthErrorClassifier,
): Promise<AuthCallbackOutcome> {
  if (!code?.trim()) {
    return { ok: false, diagnostic: { category: "callback_missing_code", code: null, httpStatus: null } };
  }

  try {
    const result = await exchange(code);
    if (result.error) {
      return { ok: false, diagnostic: classifyFailure(result.error) };
    }
    if (!result.hasSession || !result.userId) {
      return { ok: false, diagnostic: { category: "session_missing", code: null, httpStatus: null } };
    }

    const sessionUserId = await readSessionUserId();
    if (!sessionUserId || sessionUserId !== result.userId) {
      return { ok: false, diagnostic: { category: "session_not_visible", code: null, httpStatus: null } };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, diagnostic: classifyFailure(error) };
  }
}
