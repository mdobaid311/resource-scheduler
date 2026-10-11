// src/components/ResourceScheduler/hooks/useNow.ts
import { useEffect, useState } from "react";
import { useClock } from "../clock";

/** The current time, refreshed every `intervalMs`. No timer runs without one. */
export const useNow = (intervalMs?: number): Date => {
  const readClock = useClock();
  const [now, setNow] = useState(readClock);
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => setNow(readClock()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, readClock]);
  return now;
};
