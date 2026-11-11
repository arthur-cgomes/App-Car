import { TIRE_SLOTS } from "@monitoring-car/shared";
import type { Metadata } from "next";
import { TireDetailScreen } from "@/components/placar/tires/tire-detail-screen";

export const metadata: Metadata = { title: "Pneu" };

export function generateStaticParams() {
  return TIRE_SLOTS.map((slot) => ({ slot }));
}

export default async function Page({ params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  return <TireDetailScreen slot={slot} />;
}
