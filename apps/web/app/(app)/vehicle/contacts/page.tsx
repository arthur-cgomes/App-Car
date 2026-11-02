import type { Metadata } from "next";
import { ContactsScreen } from "@/components/placar/ficha/contacts-screen";

export const metadata: Metadata = { title: "Contatos de emergência" };

export default function Page() {
  return <ContactsScreen />;
}
