import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { AuthForm } from "@/components/auth/auth-form";
import { updatePasswordAction } from "@/app/auth/actions";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  return (
    <>
      <PublicHeader />
      <main className="auth-page page-width">
        {user
          ? <AuthForm mode="reset-password" action={updatePasswordAction} />
          : <section className="auth-panel" aria-labelledby="reset-link-expired"><p className="eyebrow">FLAME IN FREEFALL · ACCOUNT SECURITY</p><h1 id="reset-link-expired">Reset link unavailable</h1><p className="auth-description">This password reset link is invalid or has expired. Request a new one to continue.</p><Link className="button button-primary" href="/forgot-password">Request a reset link</Link></section>}
      </main>
      <PublicFooter />
    </>
  );
}
