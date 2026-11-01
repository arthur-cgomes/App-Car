"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function localIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useToday(): string | null {
  return useSyncExternalStore(subscribe, localIsoDate, () => null);
}
