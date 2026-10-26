"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/app/auth/actions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
type AuthAction = (state: AuthActionState, data: FormData) => Promise<AuthActionState>;
const idleAuthAction: AuthAction = async (state) => state;

const modeCopy: Record<AuthMode, { title: string; submit: string; pending: string }> = {
  "sign-in": { title: "Sign in to your workspace", submit: "Sign in", pending: "Signing in…" },
  "sign-up": { title: "Create your research account", submit: "Create account", pending: "Creating account…" },
  "forgot-password": { title: "Reset your password", submit: "Send reset link", pending: "Sending link…" },
  "reset-password": { title: "Choose a new password", submit: "Update password", pending: "Updating password…" },
};
const initialState: AuthActionState = { status: "idle", message: "" };

export function AuthForm({ mode, action, googleAction, next = "/workspace/overview", initialMessage }: {
  mode: AuthMode;
  action: AuthAction;
  googleAction?: AuthAction;
  next?: string;
  initialMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ...initialState, message: initialMessage ?? "" });
  const [googleState, googleFormAction, googlePending] = useActionState(googleAction ?? idleAuthAction, initialState);
  const copy = modeCopy[mode];
  const supportsGoogle = mode === "sign-in" || mode === "sign-up";

  function GoogleMark() {
    return <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" /><path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.5Z" /><path fill="#FBBC05" d="M6.53 13.58A5.85 5.85 0 0 1 6.22 12c0-.55.1-1.08.31-1.58V7.89H3.28A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.11l3.25-2.53Z" /><path fill="#EA4335" d="M12 6.39c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.47 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.72 5.39l3.25 2.53C7.3 8.11 9.46 6.39 12 6.39Z" /></svg>;
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-form-title">
      <p className="eyebrow">FLAME IN FREEFALL · SECURE RESEARCH WORKSPACE</p>
      <h1 id="auth-form-title">{copy.title}</h1>
      {mode === "sign-up" && <p className="auth-description">Save NASA research, organize collections, and keep private notes alongside source records.</p>}
      {mode === "sign-in" && <p className="auth-description">Your public NASA research search remains available without an account.</p>}
      {supportsGoogle && <>
        <form className="auth-oauth-form" action={googleFormAction} aria-busy={googlePending}>
          <input type="hidden" name="next" value={next} />
          <button className="button button-google" type="submit" disabled={pending || googlePending}><GoogleMark />{googlePending ? "Connecting to Google…" : "Continue with Google"}</button>
        </form>
        {googleState.message && <p className={`auth-message auth-message-${googleState.status}`} role={googleState.status === "error" ? "alert" : "status"}>{googleState.message}</p>}
        <div className="auth-divider"><span>or continue with email</span></div>
      </>}
      <form className="auth-form" action={formAction} aria-busy={pending}>
        {mode === "sign-in" && <input type="hidden" name="next" value={next} />}
        {mode === "sign-up" && (
          <div className="auth-field">
            <label htmlFor="display-name">Name</label>
            <input id="display-name" name="displayName" type="text" autoComplete="name" minLength={1} maxLength={100} required />
          </div>
        )}
        {mode !== "reset-password" && (
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={320} required />
          </div>
        )}
        {(mode === "sign-in" || mode === "sign-up" || mode === "reset-password") && (
          <div className="auth-field">
            <label htmlFor="password">{mode === "reset-password" ? "New password" : "Password"}</label>
            <input id="password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-in" ? undefined : 8} maxLength={mode === "sign-in" ? undefined : 128} required />
            {(mode === "sign-up" || mode === "reset-password") && <span className="auth-helper">Use 8 to 128 characters.</span>}
          </div>
        )}
        {(mode === "sign-up" || mode === "reset-password") && (
          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
        )}
        {state.message && <p className={`auth-message auth-message-${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
        <button className="button button-primary auth-submit" type="submit" disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </button>
      </form>
      <nav className="auth-links" aria-label="Account actions">
        {mode === "sign-in" && <><Link href="/forgot-password">Forgot password?</Link><span>New to FLAME IN FREEFALL? <Link href="/sign-up">Create an account</Link></span></>}
        {mode === "sign-up" && <span>Already have an account? <Link href="/sign-in">Sign in</Link></span>}
        {mode === "forgot-password" && <span>Remembered your password? <Link href="/sign-in">Return to sign in</Link></span>}
        {mode === "reset-password" && <span><Link href="/forgot-password">Request another reset link</Link></span>}
      </nav>
    </section>
  );
}
