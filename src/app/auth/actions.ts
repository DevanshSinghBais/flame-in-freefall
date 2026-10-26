"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";
import { normalizeEmail, readSignInCredentials, safeReturnPath, validPassword } from "@/lib/auth/validation";
import { classifySupabaseAuthError, logAuthDiagnostic } from "@/lib/auth/diagnostics";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const idleState: AuthActionState = { status: "idle", message: "" };
const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function getActionOrigin(): Promise<string | null> {
  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const requestOrigin = requestHeaders.get("origin") ?? requestHeaders.get("referer");
  const requestHost = requestHeaders.get("host");
  if (requestOrigin && requestHost) {
    try {
      const parsedRequest = new URL(requestOrigin);
      if ((parsedRequest.protocol === "https:" || parsedRequest.hostname === "localhost" || parsedRequest.hostname === "127.0.0.1")
        && parsedRequest.host.toLowerCase() === requestHost.toLowerCase()
        && (parsedRequest.hostname === "localhost" || parsedRequest.hostname === "127.0.0.1")) {
        return parsedRequest.origin;
      }
    } catch {
      // Fall through to the configured deployment origin.
    }
  }
  const candidate = configuredOrigin || requestOrigin;
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
    if (!configuredOrigin && requestHost && parsed.host.toLowerCase() !== requestHost.toLowerCase()) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function authRedirect(next: string): Promise<string | null> {
  const origin = await getActionOrigin();
  if (!origin) return null;
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeReturnPath(next));
  return url.toString();
}

function authConfigurationMessage(operation: "sign_in" | "sign_up"): string {
  return operation === "sign_in"
    ? "Google sign-in is disabled for this workspace. Add a Google OAuth client ID and secret in Supabase Authentication → Providers → Google, then try again."
    : "Google account creation is disabled for this workspace. Add a Google OAuth client ID and secret in Supabase Authentication → Providers → Google, then try again.";
}

async function readGoogleProviderEnabled(): Promise<boolean | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) return null;
  try {
    const settingsUrl = new URL("/auth/v1/settings", supabaseUrl);
    const response = await fetch(settingsUrl, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { external?: { google?: unknown } };
    return typeof payload.external?.google === "boolean" ? payload.external.google : null;
  } catch {
    return null;
  }
}

export async function signInAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const rawEmail = data.get("email");
  const rawPassword = data.get("password");
  const { email, password } = readSignInCredentials(data);
  if (!email || !password) {
    logAuthDiagnostic("sign_in", "input_validation", { category: "unknown", code: null, httpStatus: null }, {
      emailProvided: typeof rawEmail === "string" && rawEmail.length > 0,
      passwordProvided: typeof rawPassword === "string" && rawPassword.length > 0,
      passwordUnmodified: typeof rawPassword === "string",
    });
    return { status: "error", message: "Enter a valid email address and password." };
  }

  let client: Awaited<ReturnType<typeof createServerClient>>;
  try {
    client = await createServerClient();
  } catch (error) {
    const diagnostic = classifySupabaseAuthError(error);
    logAuthDiagnostic("sign_in", "client_configuration", diagnostic);
    return { status: "error", message: "Sign-in is temporarily unavailable. Try again shortly." };
  }

  let signedInUserId: string | null = null;
  let emailConfirmed = false;
  let sessionReceived = false;
  try {
    logAuthDiagnostic("sign_in", "form_fields_received", { category: "success", code: null, httpStatus: null }, {
      emailProvided: true,
      passwordProvided: true,
      passwordUnmodified: true,
    });
    const { data: result, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const diagnostic = classifySupabaseAuthError(error);
      logAuthDiagnostic("sign_in", "provider_response", diagnostic);
      const message = diagnostic.category === "email_not_confirmed"
        ? "Your email address needs verification before sign-in. Check your inbox for the confirmation link."
        : diagnostic.category === "rate_limited"
          ? "There have been too many sign-in attempts. Wait a little and try again."
          : diagnostic.category === "network" || diagnostic.category === "provider_unavailable" || diagnostic.category === "configuration"
            ? "Sign-in is temporarily unavailable. Try again shortly."
            : "Those sign-in details could not be verified. Check them and try again.";
      return { status: "error", message };
    }
    signedInUserId = result.user?.id ?? null;
    emailConfirmed = !!result.user?.email_confirmed_at;
    sessionReceived = !!result.session;
  } catch (error) {
    const diagnostic = classifySupabaseAuthError(error);
    logAuthDiagnostic("sign_in", "provider_exception", diagnostic);
    const message = diagnostic.category === "network" || diagnostic.category === "provider_unavailable" || diagnostic.category === "configuration"
      ? "Sign-in is temporarily unavailable. Try again shortly."
      : "Sign-in could not be completed. Try again.";
    return { status: "error", message };
  }

  if (!signedInUserId || !sessionReceived) {
    logAuthDiagnostic("sign_in", "session_not_returned", { category: "session_missing", code: null, httpStatus: null });
    return { status: "error", message: "Your sign-in could not establish a secure session. Try again." };
  }
  if (!emailConfirmed) {
    logAuthDiagnostic("sign_in", "email_unconfirmed", { category: "email_not_confirmed", code: "email_not_confirmed", httpStatus: null });
    await client.auth.signOut({ scope: "local" });
    return { status: "error", message: "Verify your email address before signing in. Use the link sent to your inbox, or create a new account." };
  }

  try {
    const { data: claimsData, error } = await client.auth.getClaims();
    const claimUserId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
    if (error) {
      logAuthDiagnostic("session_verification", "sign_in_claims", classifySupabaseAuthError(error));
      return { status: "error", message: "Your credentials were accepted, but a secure session could not be confirmed. Refresh and try again." };
    }
    if (!claimUserId || claimUserId !== signedInUserId) {
      logAuthDiagnostic("session_verification", "sign_in_claims", { category: "session_not_visible", code: null, httpStatus: null });
      return { status: "error", message: "Your credentials were accepted, but a secure session could not be confirmed. Refresh and try again." };
    }
  } catch (error) {
    logAuthDiagnostic("session_verification", "sign_in_claims_exception", classifySupabaseAuthError(error));
    return { status: "error", message: "Your credentials were accepted, but a secure session could not be confirmed. Refresh and try again." };
  }

  logAuthDiagnostic("sign_in", "session_verified_before_redirect", { category: "success", code: null, httpStatus: null });
  revalidatePath("/", "layout");
  redirect(safeReturnPath(data.get("next")));
}

export async function signInWithGoogleAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const redirectTo = await authRedirect(safeReturnPath(data.get("next")));
  if (!redirectTo) {
    logAuthDiagnostic("sign_in", "oauth_redirect_configuration", { category: "configuration", code: null, httpStatus: null });
    return { status: "error", message: "Google sign-in is not configured for this request. Set NEXT_PUBLIC_SITE_URL for deployed environments." };
  }

  if (await readGoogleProviderEnabled() === false) {
    logAuthDiagnostic("sign_in", "oauth_provider_disabled", { category: "configuration", code: "validation_failed", httpStatus: 400 });
    return { status: "error", message: authConfigurationMessage("sign_in") };
  }

  let oauthUrl: string | null = null;
  try {
    const client = await createServerClient();
    const { data: oauth, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) {
      const diagnostic = classifySupabaseAuthError(error);
      logAuthDiagnostic("sign_in", "oauth_provider_response", diagnostic);
      return {
        status: "error",
        message: diagnostic.category === "configuration" ? authConfigurationMessage("sign_in") : "Google sign-in could not be started. Try again shortly.",
      };
    }
    oauthUrl = oauth.url ?? null;
  } catch (error) {
    const diagnostic = classifySupabaseAuthError(error);
    logAuthDiagnostic("sign_in", "oauth_provider_exception", diagnostic);
    return {
      status: "error",
      message: diagnostic.category === "configuration" ? authConfigurationMessage("sign_in") : "Google sign-in could not be started. Try again shortly.",
    };
  }

  if (!oauthUrl) {
    logAuthDiagnostic("sign_in", "oauth_url_missing", { category: "provider_unavailable", code: null, httpStatus: null });
    return { status: "error", message: "Google sign-in could not be started. Try again shortly." };
  }
  logAuthDiagnostic("sign_in", "oauth_redirect_started", { category: "success", code: null, httpStatus: null });
  redirect(oauthUrl);
}

export async function signUpAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const displayName = field(data, "displayName");
  const email = normalizeEmail(data.get("email"));
  const password = String(data.get("password") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");
  if (displayName.length < 1 || displayName.length > 100) return { status: "error", message: "Enter a name with 1 to 100 characters." };
  if (!email) return { status: "error", message: "Enter a valid email address." };
  if (!validPassword(password)) return { status: "error", message: "Use a password between 8 and 128 characters." };
  if (password !== confirmPassword) return { status: "error", message: "The passwords do not match." };

  const redirectTo = await authRedirect("/auth/verified");
  if (!redirectTo) {
    logAuthDiagnostic("sign_up", "redirect_configuration", { category: "configuration", code: null, httpStatus: null });
    return { status: "error", message: "Secure email links are not configured for this request. Set NEXT_PUBLIC_SITE_URL for deployed environments." };
  }

  let client: Awaited<ReturnType<typeof createServerClient>>;
  try {
    client = await createServerClient();
  } catch (error) {
    logAuthDiagnostic("sign_up", "client_configuration", classifySupabaseAuthError(error, "sign_up"));
    return { status: "error", message: "Account creation is temporarily unavailable. Try again shortly." };
  }

  let sessionCreated = false;
  try {
    const response = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: redirectTo },
    });
    sessionCreated = !!response.data.session;
    if (response.error) {
      const diagnostic = classifySupabaseAuthError(response.error, "sign_up");
      logAuthDiagnostic("sign_up", "provider_response", diagnostic);
      const message = diagnostic.category === "rate_limited"
        ? "There have been too many account requests. Wait a little and try again."
        : diagnostic.category === "network" || diagnostic.category === "provider_unavailable" || diagnostic.category === "configuration"
          ? "Account creation is temporarily unavailable. Try again shortly."
          : "Your account could not be created. Check your details and try again.";
      return { status: "error", message };
    }
  } catch (error) {
    const diagnostic = classifySupabaseAuthError(error, "sign_up");
    logAuthDiagnostic("sign_up", "provider_exception", diagnostic);
    return { status: "error", message: "Account creation is temporarily unavailable. Try again shortly." };
  }

  if (sessionCreated) {
    logAuthDiagnostic("sign_up", "session_created", { category: "success", code: null, httpStatus: null });
    revalidatePath("/", "layout");
    redirect("/workspace/overview");
  }
  logAuthDiagnostic("sign_up", "confirmation_pending", { category: "success", code: null, httpStatus: null });
  return { status: "success", message: "If the address can be registered, a verification link will arrive by email. Open it to activate your account." };
}

export async function requestPasswordResetAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const email = normalizeEmail(data.get("email"));
  if (!email) return { status: "error", message: "Enter a valid email address." };
  const redirectTo = await authRedirect("/reset-password");
  if (!redirectTo) return { status: "error", message: "Secure email links are not configured for this request. Set NEXT_PUBLIC_SITE_URL for deployed environments." };
  const client = await createServerClient();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { status: "error", message: "The password reset request could not be sent. Try again shortly." };
  return { status: "success", message: "If an account uses that address, a password reset link will arrive by email." };
}

export async function updatePasswordAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const password = String(data.get("password") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");
  if (!validPassword(password)) return { status: "error", message: "Use a password between 8 and 128 characters." };
  if (password !== confirmPassword) return { status: "error", message: "The passwords do not match." };

  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  if (!user) return { status: "error", message: "This reset link is invalid or has expired. Request a new one." };
  const { error } = await client.auth.updateUser({ password });
  if (error) return { status: "error", message: "The password could not be updated. Request a new reset link and try again." };
  revalidatePath("/", "layout");
  redirect("/workspace/settings?status=password-updated");
}

export async function updateDisplayNameAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const displayName = field(data, "displayName");
  if (displayName.length < 1 || displayName.length > 100) return { status: "error", message: "Enter a name with 1 to 100 characters." };
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  if (!user) return { status: "error", message: "Your session expired. Sign in again." };
  const { error } = await client.from("profiles").update({ display_name: displayName }).eq("id", user.id);
  if (error) return { status: "error", message: "Profile settings are unavailable. Apply the Supabase database migration and try again." };
  revalidatePath("/workspace/settings");
  revalidatePath("/workspace", "layout");
  return { status: "success", message: "Your profile name was saved." };
}

export async function updateEmailAction(_previous: AuthActionState = idleState, data: FormData): Promise<AuthActionState> {
  const email = normalizeEmail(data.get("email"));
  if (!email) return { status: "error", message: "Enter a valid email address." };
  const redirectTo = await authRedirect("/workspace/settings?status=email-updated");
  if (!redirectTo) return { status: "error", message: "Secure email links are not configured for this request. Set NEXT_PUBLIC_SITE_URL for deployed environments." };
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  if (!user) return { status: "error", message: "Your session expired. Sign in again." };
  const { error } = await client.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
  if (error) return { status: "error", message: "The email update could not be started. Check the address and try again." };
  return { status: "success", message: "Confirmation links were sent to the current and new email addresses." };
}

export async function signOutAction(): Promise<void> {
  const client = await createServerClient();
  await client.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in?status=signed-out");
}
