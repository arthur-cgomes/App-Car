import type { Metadata } from "next";
import { ReportsScreen } from "@/components/placar/ficha/reports-screen";

export const metadata: Metadata = { title: "Relatórios" };

export default function Page() {
  return <ReportsScreen />;
}
