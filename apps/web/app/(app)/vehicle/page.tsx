import type { Metadata } from "next";
import { FichaScreen } from "@/components/placar/ficha/ficha-screen";

export const metadata: Metadata = { title: "Ficha do veículo" };

export default function FichaPage() {
  return <FichaScreen />;
}
