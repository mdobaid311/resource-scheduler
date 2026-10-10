// src/components/ResourceScheduler/density.ts
import { createContext, useContext } from "react";

export type Density = "comfortable" | "compact";

/** Height in px of one lane of events, and of the event card inside it. */
export const LANES = {
  comfortable: { lane: 52, card: 48 },
  compact: { lane: 38, card: 34 },
} as const;

/** Space in px below the lanes of a row. */
export const ROW_PADDING = 8;

/** A row with a utilization bar is never shorter than this: the name and the bar need it. */
export const UTILIZATION_ROW_HEIGHT = 60;

export const DensityContext = createContext<Density>("comfortable");

export const useDensity = () => useContext(DensityContext);
