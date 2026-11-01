import type { Metadata } from "next";
import { GastosScreen } from "@/components/placar/screens/gastos-screen";

export const metadata: Metadata = { title: "Gastos" };

export default function GastosPage() {
  return <GastosScreen />;
}
