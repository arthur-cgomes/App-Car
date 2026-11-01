import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/placar/auth/forgot-password-screen";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return <ForgotPasswordScreen />;
}
