"use client";

import { useSyncExternalStore } from "react";
import { capitalize } from "@/lib/format";

const subscribe = () => () => {};
const today = () => capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()));

export function TodayLabel() {
  return useSyncExternalStore(subscribe, today, () => "");
}
