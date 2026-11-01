import type { Metadata } from "next";
import { FuelScreen } from "@/components/placar/ficha/fuel-screen";

export const metadata: Metadata = { title: "Abastecimentos" };

export default function Page() {
  return <FuelScreen />;
}
