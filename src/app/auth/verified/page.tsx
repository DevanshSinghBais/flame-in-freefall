import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/server/auth-guard";

export const metadata: Metadata = { title: "Email verified" };

export default async function VerifiedPage() {
  const client = await createServerClient();
  const user = await getVerifiedUser(client);
  return (
    <>
      <PublicHeader />
      <main className="auth-page page-width">
        <section className="auth-panel" aria-labelledby="verification-complete"><p className="eyebrow">FLAME IN FREEFALL · ACCOUNT SECURITY</p><h1 id="verification-complete">Email verified</h1><p className="auth-description">Your email address has been verified. {user ? "Your research workspace is ready." : "Sign in to open your research workspace."}</p><Link className="button button-primary" href={user ? "/workspace/overview" : "/sign-in"}>{user ? "Open research workspace" : "Continue to sign in"}</Link></section>
      </main>
      <PublicFooter />
    </>
  );
}
