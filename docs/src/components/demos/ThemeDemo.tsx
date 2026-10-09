import { useEffect, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

const PRESETS = {
  Default: { "--rs-primary": "#3b82f6", "--rs-accent": "#e0f2fe", "--rs-today": "#eff6ff", "--rs-ring": "#3b82f6" },
  Violet: { "--rs-primary": "#7c3aed", "--rs-accent": "#ede9fe", "--rs-today": "#f5f3ff", "--rs-ring": "#7c3aed" },
  Emerald: { "--rs-primary": "#059669", "--rs-accent": "#d1fae5", "--rs-today": "#ecfdf5", "--rs-ring": "#059669" },
  Rose: { "--rs-primary": "#e11d48", "--rs-accent": "#ffe4e6", "--rs-today": "#fff1f2", "--rs-ring": "#e11d48" },
} as const;

/** Tokens are plain CSS variables, so a theme is a handful of lines. */
export default function ThemeDemo() {
  const { resources, move, resize } = useSchedule(teamWeek);
  const [preset, setPreset] = useState<keyof typeof PRESETS>("Violet");

  // Popovers render in a portal, so the tokens go on :root rather than a wrapper.
  useEffect(() => {
    const root = document.documentElement;
    const vars = PRESETS[preset];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => Object.keys(vars).forEach((k) => root.style.removeProperty(k));
  }, [preset]);

  return (
    <Frame
      height={440}
      controls={
        <label>
          Preset
          <select value={preset} onChange={(e) => setPreset(e.target.value as keyof typeof PRESETS)}>
            {Object.keys(PRESETS).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      }
      caption="Switch the site's light/dark toggle too: the scheduler follows it."
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week]}
        resourceColumnWidth="150px"
        dateColumnWidth="110px"
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
