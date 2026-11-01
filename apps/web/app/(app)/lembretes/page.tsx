import type { Metadata } from "next";
import { LembretesScreen } from "@/components/placar/screens/lembretes-screen";

export const metadata: Metadata = { title: "Lembretes" };

export default function LembretesPage() {
  return <LembretesScreen />;
}
