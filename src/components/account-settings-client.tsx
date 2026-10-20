"use client";

import { useActionState } from "react";
import {
  updateDisplayNameAction,
  updateEmailAction,
  updatePasswordAction,
  type AuthActionState,
} from "@/app/auth/actions";

const initial: AuthActionState = { status: "idle", message: "" };

function SettingsStatus({ state }: { state: AuthActionState }) {
  return state.message ? <p className={`auth-message auth-message-${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null;
}

export function AccountSettingsClient({ email, displayName, emailVerified, statusMessage }: {
  email: string;
  displayName: string;
  emailVerified: boolean;
  statusMessage?: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateDisplayNameAction, initial);
  const [emailState, emailAction, emailPending] = useActionState(updateEmailAction, initial);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePasswordAction, initial);

  return (
    <div className="personal-page account-settings-page">
      <header className="workspace-heading"><div><p className="eyebrow">FLAME IN FREEFALL · ACCOUNT</p><h1>Settings</h1><p className="workspace-lede">Manage your sign-in details and personal research profile.</p></div><span className={`workspace-scope ${emailVerified ? "scope-verified" : "scope-unverified"}`}>{emailVerified ? "EMAIL VERIFIED" : "EMAIL NOT VERIFIED"}</span></header>
      {statusMessage && <p className="inline-status" role="status">{statusMessage}</p>}
      <section className="personal-data-section account-summary" aria-labelledby="account-summary-title"><div><p className="eyebrow">ACCOUNT</p><h2 id="account-summary-title">Sign-in identity</h2></div><dl><div><dt>Email address</dt><dd>{email}</dd></div><div><dt>Verification</dt><dd>{emailVerified ? "Verified" : "Pending"}</dd></div></dl></section>
      <section className="personal-data-section" aria-labelledby="profile-name-title">
        <div className="personal-section-heading"><div><p className="eyebrow">PROFILE</p><h2 id="profile-name-title">Display name</h2><p>This name appears only in your private FLAME IN FREEFALL workspace.</p></div></div>
        <form className="settings-form" action={profileAction} aria-busy={profilePending}>
          <label htmlFor="settings-display-name">Name<input id="settings-display-name" name="displayName" defaultValue={displayName} minLength={1} maxLength={100} autoComplete="name" required /></label>
          <button className="button button-secondary" type="submit" disabled={profilePending}>{profilePending ? "Saving…" : "Save name"}</button>
          <SettingsStatus state={profileState} />
        </form>
      </section>
      <section className="personal-data-section" aria-labelledby="change-email-title">
        <div className="personal-section-heading"><div><p className="eyebrow">EMAIL SECURITY</p><h2 id="change-email-title">Change email address</h2><p>Supabase sends confirmation links to the current and new email addresses.</p></div></div>
        <form className="settings-form" action={emailAction} aria-busy={emailPending}>
          <label htmlFor="settings-email">New email address<input id="settings-email" name="email" type="email" defaultValue={email} maxLength={320} autoComplete="email" required /></label>
          <button className="button button-secondary" type="submit" disabled={emailPending}>{emailPending ? "Sending…" : "Start email change"}</button>
          <SettingsStatus state={emailState} />
        </form>
      </section>
      <section className="personal-data-section" aria-labelledby="change-password-title">
        <div className="personal-section-heading"><div><p className="eyebrow">ACCOUNT SECURITY</p><h2 id="change-password-title">Change password</h2><p>Choose a new password for future sign-ins.</p></div></div>
        <form className="settings-form settings-password-form" action={passwordAction} aria-busy={passwordPending}>
          <label htmlFor="settings-password">New password<input id="settings-password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /><small>Use 8 to 128 characters.</small></label>
          <label htmlFor="settings-password-confirm">Confirm new password<input id="settings-password-confirm" name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
          <button className="button button-secondary" type="submit" disabled={passwordPending}>{passwordPending ? "Updating…" : "Update password"}</button>
          <SettingsStatus state={passwordState} />
        </form>
      </section>
    </div>
  );
}
