"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/app/auth/actions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
type AuthAction = (state: AuthActionState, data: FormData) => Promise<AuthActionState>;

const modeCopy: Record<AuthMode, { title: string; submit: string; pending: string }> = {
  "sign-in": { title: "Sign in to your workspace", submit: "Sign in", pending: "Signing in…" },
  "sign-up": { title: "Create your research account", submit: "Create account", pending: "Creating account…" },
  "forgot-password": { title: "Reset your password", submit: "Send reset link", pending: "Sending link…" },
  "reset-password": { title: "Choose a new password", submit: "Update password", pending: "Updating password…" },
};
const initialState: AuthActionState = { status: "idle", message: "" };

export function AuthForm({ mode, action, next = "/workspace/overview", initialMessage }: {
  mode: AuthMode;
  action: AuthAction;
  next?: string;
  initialMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ...initialState, message: initialMessage ?? "" });
  const copy = modeCopy[mode];

  return (
    <section className="auth-panel" aria-labelledby="auth-form-title">
      <p className="eyebrow">FLAME IN FREEFALL · SECURE RESEARCH WORKSPACE</p>
      <h1 id="auth-form-title">{copy.title}</h1>
      {mode === "sign-up" && <p className="auth-description">Save NASA research, organize collections, and keep private notes alongside source records.</p>}
      {mode === "sign-in" && <p className="auth-description">Your public NASA research search remains available without an account.</p>}
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
