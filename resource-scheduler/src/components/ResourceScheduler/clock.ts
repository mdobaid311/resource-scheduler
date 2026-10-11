// src/components/ResourceScheduler/clock.ts
import { createContext, useContext } from "react";

/**
 * What "now" is: the real time, or, with the `timeZone` prop, the wall-clock
 * time in that zone. Today's highlight, the now line and the Today button read it.
 */
export const ClockContext = createContext<() => Date>(() => new Date());

export const useClock = () => useContext(ClockContext);
