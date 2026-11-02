import type { Metadata } from "next";
import { IntegrationsScreen } from "@/components/placar/profile/integrations-screen";

export const metadata: Metadata = { title: "Integrações" };

export default function Page() {
  return <IntegrationsScreen />;
}
