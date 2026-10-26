import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { AuthForm } from "@/components/auth/auth-form";
import { signInAction, signInWithGoogleAction } from "@/app/auth/actions";
import { safeReturnPath } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; status?: string; error?: string }> }) {
  const params = await searchParams;
  const message = params.status === "signed-out"
    ? "You have signed out. Your public research search remains available."
    : params.error === "callback"
      ? "That email link could not be verified. Request a new link and try again."
      : params.error === "oauth"
        ? "Google sign-in was canceled or could not be completed. Try again or continue with email."
        : undefined;

  return (
    <>
      <PublicHeader />
      <main className="auth-page page-width">
        <AuthForm mode="sign-in" action={signInAction} googleAction={signInWithGoogleAction} next={safeReturnPath(params.next)} initialMessage={message} />
      </main>
      <PublicFooter />
    </>
  );
}
