"use client";

import { useEffect, useState } from "react";

export function useCountdown(initialSeconds = 0) {
  const [run, setRun] = useState({ seconds: initialSeconds });
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!run.seconds) return;
    const until = Date.now() + run.seconds * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSeconds(left);
      if (!left) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [run]);

  return {
    seconds,
    start: (next: number) => {
      setSeconds(next);
      setRun({ seconds: next });
    },
  };
}

export function resendLabel(seconds: number) {
  return seconds > 0 ? `Reenviar em 0:${String(seconds).padStart(2, "0")}` : "Reenviar código";
}
