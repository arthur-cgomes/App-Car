import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Consulta" };

export default function ConsultaPage() {
  redirect("/");
}
