import type { Metadata } from "next";
import { TiresScreen } from "@/components/placar/tires/tires-screen";

export const metadata: Metadata = { title: "Pneus" };

export default function Page() {
  return <TiresScreen />;
}
