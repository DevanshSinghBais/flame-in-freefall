import test from "node:test";
import assert from "node:assert/strict";
import { classifySupabaseAuthError } from "../src/lib/auth/diagnostics.ts";
import { completeAuthCallback } from "../src/lib/auth/callback-core.ts";
const classifyCallbackError = (error) => classifySupabaseAuthError(error, "email_callback");

test("Supabase sign-in failures are classified without exposing their messages", () => {
  const cases = [
    [{ name: "AuthApiError", code: "invalid_credentials", status: 400, message: "Invalid login credentials for private@example.test" }, "invalid_credentials", 400],
    [{ name: "AuthApiError", code: "email_not_confirmed", status: 400, message: "Email not confirmed" }, "email_not_confirmed", 400],
    [{ name: "AuthApiError", code: "over_request_rate_limit", status: 429, message: "rate limit" }, "rate_limited", 429],
    [{ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" }, "network", null],
    [{ name: "AuthRetryableFetchError", status: 503, message: "temporary outage" }, "provider_unavailable", 503],
    [{ name: "Error", message: "Missing Supabase configuration variable" }, "configuration", null],
  ];

  for (const [error, category, httpStatus] of cases) {
    assert.deepEqual(classifySupabaseAuthError(error), {
      category,
      code: error.code ?? null,
      httpStatus,
    });
  }
  assert.equal(JSON.stringify(classifySupabaseAuthError(cases[0][0])).includes("private@example.test"), false);
});

test("unsafe provider codes are omitted from diagnostics", () => {
  assert.deepEqual(classifySupabaseAuthError({ code: "token=private-value", status: 400 }), {
    category: "unknown",
    code: null,
    httpStatus: 400,
  });
});

test("email callback rejects a missing code without exchanging it", async () => {
  let exchangeCalled = false;
  const result = await completeAuthCallback(null, async () => { exchangeCalled = true; return { error: null, hasSession: true, userId: "user" }; }, async () => "user", classifyCallbackError);
  assert.equal(exchangeCalled, false);
  assert.deepEqual(result, { ok: false, diagnostic: { category: "callback_missing_code", code: null, httpStatus: null } });
});

test("email callback classifies expired confirmation links", async () => {
  const result = await completeAuthCallback("opaque-code", async () => ({
    error: { name: "AuthApiError", code: "flow_state_expired", status: 400, message: "expired private token" },
    hasSession: false,
    userId: null,
  }), async () => null, classifyCallbackError);
  assert.deepEqual(result, { ok: false, diagnostic: { category: "callback_link_invalid", code: "flow_state_expired", httpStatus: 400 } });
  assert.equal(JSON.stringify(result).includes("private token"), false);
});

test("email callback does not succeed without a session or matching server-visible user", async () => {
  const noSession = await completeAuthCallback("opaque-code", async () => ({ error: null, hasSession: false, userId: null }), async () => null, classifyCallbackError);
  assert.deepEqual(noSession, { ok: false, diagnostic: { category: "session_missing", code: null, httpStatus: null } });

  const notVisible = await completeAuthCallback("opaque-code", async () => ({ error: null, hasSession: true, userId: "user-a" }), async () => "user-b", classifyCallbackError);
  assert.deepEqual(notVisible, { ok: false, diagnostic: { category: "session_not_visible", code: null, httpStatus: null } });
});

test("email callback succeeds only after the exchanged user is visible in server claims", async () => {
  const steps = [];
  const result = await completeAuthCallback("opaque-code", async (code) => {
    steps.push(`exchange:${code}`);
    return { error: null, hasSession: true, userId: "user-a" };
  }, async () => {
    steps.push("read-session");
    return "user-a";
  }, classifyCallbackError);
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(steps, ["exchange:opaque-code", "read-session"]);
});

test("email callback handles provider/network exceptions without leaking details", async () => {
  const result = await completeAuthCallback("opaque-code", async () => {
    throw Object.assign(new TypeError("fetch failed for private-value"), { status: 0 });
  }, async () => null, classifyCallbackError);
  assert.deepEqual(result, { ok: false, diagnostic: { category: "network", code: null, httpStatus: null } });
  assert.equal(JSON.stringify(result).includes("private-value"), false);
});
