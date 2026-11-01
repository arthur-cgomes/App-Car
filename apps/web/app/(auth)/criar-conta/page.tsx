import type { Metadata } from "next";
import { SignupScreen } from "@/components/placar/auth/signup-screen";

export const metadata: Metadata = { title: "Criar conta" };

export default function CriarContaPage() {
  return <SignupScreen />;
}
