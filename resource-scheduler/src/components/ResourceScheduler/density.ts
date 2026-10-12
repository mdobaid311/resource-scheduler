// src/components/ResourceScheduler/density.ts
import { createContext, useContext } from "react";
import type { Density } from "./utils/layout";

// The sizes live in utils/layout (no React), where the headless entry reads them.
export {
  COLUMN_UTILIZATION_HEIGHT,
  LANES,
  ROW_PADDING,
  UTILIZATION_ROW_HEIGHT,
} from "./utils/layout";
export type { Density } from "./utils/layout";

export const DensityContext = createContext<Density>("comfortable");

export const useDensity = () => useContext(DensityContext);
