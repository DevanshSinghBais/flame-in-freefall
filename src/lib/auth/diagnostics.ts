export type AuthDiagnosticCategory =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "rate_limited"
  | "network"
  | "provider_unavailable"
  | "configuration"
  | "callback_link_invalid"
  | "callback_missing_code"
  | "session_missing"
  | "session_not_visible"
  | "success"
  | "unknown";

export type AuthDiagnostic = {
  category: AuthDiagnosticCategory;
  code: string | null;
  httpStatus: number | null;
};

type SafeAuthInputShape = {
  emailProvided?: boolean;
  passwordProvided?: boolean;
  passwordUnmodified?: boolean;
};

type AuthOperation = "sign_in" | "sign_up" | "email_callback" | "session_verification" | "protected_route";

function errorFields(error: unknown): { code: string | null; httpStatus: number | null; name: string; message: string } {
  if (typeof error !== "object" || error === null) {
    return { code: null, httpStatus: null, name: typeof error, message: typeof error === "string" ? error.toLowerCase() : "" };
  }

  const fields = error as { code?: unknown; status?: unknown; name?: unknown; message?: unknown };
  const rawCode = typeof fields.code === "string" ? fields.code : null;
  const code = rawCode && /^[a-z][a-z0-9_.-]{0,63}$/i.test(rawCode) ? rawCode : null;
  const rawStatus = fields.status;
  const httpStatus = typeof rawStatus === "number" && Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus
    : null;
  return {
    code,
    httpStatus,
    name: typeof fields.name === "string" ? fields.name : "",
    message: typeof fields.message === "string" ? fields.message.toLowerCase() : "",
  };
}

export function classifySupabaseAuthError(error: unknown, operation: "sign_in" | "sign_up" | "email_callback" = "sign_in"): AuthDiagnostic {
  const { code, httpStatus, name, message } = errorFields(error);
  const normalizedCode = code?.toLowerCase() ?? "";

  let category: AuthDiagnosticCategory = "unknown";
  if (/missing supabase configuration|must be a valid https url|invalid url/.test(message)) {
    category = "configuration";
  } else if (operation === "email_callback" && /expired|invalid.*(code|token|otp)|flow_state/.test(`${normalizedCode} ${message}`)) {
    category = "callback_link_invalid";
  } else if (normalizedCode === "email_not_confirmed" || /email.*not confirmed/.test(message)) {
    category = "email_not_confirmed";
  } else if (normalizedCode === "invalid_credentials" || /invalid login credentials/.test(message)) {
    category = "invalid_credentials";
  } else if (httpStatus === 429 || /rate_limit|too_many_requests|over_request/.test(normalizedCode)) {
    category = "rate_limited";
  } else if (httpStatus !== null && httpStatus >= 500) {
    category = "provider_unavailable";
  } else if (name === "AuthRetryableFetchError" || httpStatus === 0 || name === "TypeError" || /failed to fetch|fetch failed|network error|connection refused|timed out/.test(message)) {
    category = "network";
  } else if (["invalid_api_key", "invalid_project_ref", "project_not_found", "bad_api_key", "validation_failed"].includes(normalizedCode)
    || httpStatus === 401 || httpStatus === 403) {
    category = "configuration";
  }

  return { category, code, httpStatus };
}

export function logAuthDiagnostic(operation: AuthOperation, stage: string, diagnostic: AuthDiagnostic, inputShape?: SafeAuthInputShape): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(JSON.stringify({ event: "supabase_auth_diagnostic", operation, stage, ...diagnostic, ...inputShape }));
}
