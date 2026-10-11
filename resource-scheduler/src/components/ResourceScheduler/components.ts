// src/components/ResourceScheduler/components.ts
import { createContext, useContext } from "react";
import type { SchedulerComponents } from "./types";

/** The parts the app replaced with its own components. Empty by default. */
export const ComponentsContext = createContext<SchedulerComponents>({});

export const useComponents = () => useContext(ComponentsContext);
