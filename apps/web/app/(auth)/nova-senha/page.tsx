import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordScreen } from "@/components/placar/auth/reset-password-screen";

export const metadata: Metadata = { title: "Nova senha" };

export default function NovaSenhaPage() {
  return (
    <Suspense>
      <ResetPasswordScreen />
    </Suspense>
  );
}
