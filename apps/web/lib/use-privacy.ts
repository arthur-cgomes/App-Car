"use client";

import { useSyncExternalStore } from "react";
import { PRIVACY_KEY, readPrivacy } from "./privacy";

const subscribe = (onChange: () => void) => {
  window.addEventListener(PRIVACY_KEY, onChange);
  return () => window.removeEventListener(PRIVACY_KEY, onChange);
};

export function usePrivacy() {
  return useSyncExternalStore(subscribe, readPrivacy, () => true);
}
