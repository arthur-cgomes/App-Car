import type { Metadata } from "next";
import { ProfileScreen } from "@/components/placar/profile/profile-screen";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return <ProfileScreen />;
}
