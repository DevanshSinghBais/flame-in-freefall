import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { AuthForm } from "@/components/auth/auth-form";
import { requestPasswordResetAction } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <PublicHeader />
      <main className="auth-page page-width"><AuthForm mode="forgot-password" action={requestPasswordResetAction} /></main>
      <PublicFooter />
    </>
  );
}
