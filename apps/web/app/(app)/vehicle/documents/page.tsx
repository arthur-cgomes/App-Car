import type { Metadata } from "next";
import { DocumentsScreen } from "@/components/placar/ficha/documents-screen";

export const metadata: Metadata = { title: "Documentos" };

export default function Page() {
  return <DocumentsScreen />;
}
