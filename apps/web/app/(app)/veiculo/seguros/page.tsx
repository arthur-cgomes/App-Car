import type { Metadata } from "next";
import { InsurancesScreen } from "@/components/placar/ficha/insurances-screen";

export const metadata: Metadata = { title: "Seguros" };

export default function Page() {
  return <InsurancesScreen />;
}
