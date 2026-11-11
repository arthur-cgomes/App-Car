import type { Metadata } from "next";
import { RotationScreen } from "@/components/placar/tires/rotation-screen";

export const metadata: Metadata = { title: "Planejar rodízio" };

export default function Page() {
  return <RotationScreen />;
}
