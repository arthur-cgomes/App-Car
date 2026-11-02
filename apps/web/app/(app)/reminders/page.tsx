import type { Metadata } from "next";
import { Suspense } from "react";
import { LembretesScreen } from "@/components/placar/screens/lembretes-screen";

export const metadata: Metadata = { title: "Lembretes" };

export default function LembretesPage() {
  return (
    <Suspense>
      <LembretesScreen />
    </Suspense>
  );
}
