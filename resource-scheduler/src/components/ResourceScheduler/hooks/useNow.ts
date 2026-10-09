// src/components/ResourceScheduler/hooks/useNow.ts
import { useEffect, useState } from "react";

/** The current time, refreshed every `intervalMs`. No timer runs without one. */
export const useNow = (intervalMs?: number): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
