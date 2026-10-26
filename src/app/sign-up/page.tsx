import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction, signInWithGoogleAction } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <>
      <PublicHeader />
      <main className="auth-page page-width"><AuthForm mode="sign-up" action={signUpAction} googleAction={signInWithGoogleAction} /></main>
      <PublicFooter />
    </>
  );
}
