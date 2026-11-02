import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsultaScreen } from "@/components/placar/screens/consulta-screen";

export const metadata: Metadata = { title: "Consulta" };

export default function ConsultaPage() {
  return (
    <Suspense>
      <ConsultaScreen />
    </Suspense>
  );
}
