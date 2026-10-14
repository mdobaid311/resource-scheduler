import { useEffect, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import EquipmentRentalDemo from "@demos/EquipmentRentalDemo";
import FieldServiceDemo from "@demos/FieldServiceDemo";
import ProjectAllocationDemo from "@demos/ProjectAllocationDemo";
import RoomBookingDemo from "@demos/RoomBookingDemo";
import ShiftRosterDemo from "@demos/ShiftRosterDemo";
import UtilizationDemo from "@demos/UtilizationDemo";
import type { DemoProps } from "@demos/Frame";

const DOCS = "https://resource-scheduler-demo.vercel.app";
const REPO = "https://github.com/mdobaid311/resource-scheduler";

const RECIPES: {
  id: string;
  label: string;
  blurb: string;
  doc: string;
  Demo: ComponentType<DemoProps>;
}[] = [
  {
    id: "room-booking",
    label: "Room booking",
    blurb: "Pick free time on a room to book it. Booked time can't be selected, moved onto or resized into.",
    doc: "recipes/room-booking",
    Demo: RoomBookingDemo,
  },
  {
    id: "shift-roster",
    label: "Shift roster",
    blurb: "Staff on shifts with their own hours. Time off is blocked, and each row shows how full it is.",
    doc: "recipes/shift-roster",
    Demo: ShiftRosterDemo,
  },
  {
    id: "equipment-rental",
    label: "Equipment",
    blurb: "Stock with several units, rented for days. Find the next free stretch, and never overbook.",
    doc: "recipes/equipment-rental",
    Demo: EquipmentRentalDemo,
  },
  {
    id: "field-service",
    label: "Field service",
    blurb: "Dispatch jobs to technicians. One click picks the technician who can take it first.",
    doc: "recipes/field-service-dispatch",
    Demo: FieldServiceDemo,
  },
  {
    id: "project-allocation",
    label: "Project allocation",
    blurb: "Plan people across projects by the month. An allocation can't leave its project's dates.",
    doc: "recipes/project-allocation",
    Demo: ProjectAllocationDemo,
  },
  {
    id: "utilization",
    label: "Utilization",
    blurb: "Booked against available time for every person, from their hours and capacity.",
    doc: "guides/utilization",
    Demo: UtilizationDemo,
  },
];

type Theme = "light" | "dark" | "system";
type Density = "comfortable" | "compact";

// Accent colours for the highlight, the drag footprint and today's column. Dark
// needs its own accent and today shades, so each preset carries both.
const PRESETS = {
  Default: null,
  Violet: { primary: "#7c3aed", accent: ["#ede9fe", "#4c1d95"], today: ["#f5f3ff", "#1f1637"] },
  Emerald: { primary: "#059669", accent: ["#d1fae5", "#064e3b"], today: ["#ecfdf5", "#0f2a22"] },
  Rose: { primary: "#e11d48", accent: ["#ffe4e6", "#881337"], today: ["#fff1f2", "#2c141c"] },
  Slate: { primary: "#475569", accent: ["#e2e8f0", "#334155"], today: ["#f1f5f9", "#1e293b"] },
} as const;
type Preset = keyof typeof PRESETS;

const KEY = "rs-showcase";
const THEMES: Theme[] = ["light", "dark", "system"];
const DENSITIES: Density[] = ["comfortable", "compact"];

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
};
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export default function App() {
  const saved = load();
  const [theme, setTheme] = useState<Theme>(() => pick(saved.theme, THEMES, "system"));
  const [preset, setPreset] = useState<Preset>(() => pick(saved.preset, Object.keys(PRESETS) as Preset[], "Default"));
  const [density, setDensity] = useState<Density>(() => pick(saved.density, DENSITIES, "comfortable"));
  const [tab, setTab] = useState(() =>
    pick(location.hash.slice(1) || saved.tab, RECIPES.map((r) => r.id), RECIPES[0].id)
  );
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = theme === "dark" || (theme === "system" && systemDark);

  // The theme is an attribute on <html>, so popovers (which render in a portal) follow it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // A preset is a handful of --rs-* variables on <html>.
  useEffect(() => {
    const root = document.documentElement.style;
    const p = PRESETS[preset];
    const vars: Record<string, string> = p
      ? {
          "--rs-primary": p.primary,
          "--rs-ring": p.primary,
          "--rs-accent": p.accent[dark ? 1 : 0],
          "--rs-today": p.today[dark ? 1 : 0],
        }
      : {};
    Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
    return () => Object.keys(vars).forEach((k) => root.removeProperty(k));
  }, [preset, dark]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, preset, density, tab }));
    } catch {
      /* private mode: the page works without it */
    }
  }, [theme, preset, density, tab]);

  const select = (id: string) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  const onTabKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = RECIPES[(index + step + RECIPES.length) % RECIPES.length].id;
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const active = RECIPES.find((r) => r.id === tab) ?? RECIPES[0];
  const Demo = active.Demo;

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">resource-scheduler</p>
        <h1>A resource timeline you can drag, theme and trust.</h1>
        <p className="lede">
          Five real scheduling problems, one component. Every board below is live: drag, resize, book, and change the
          look without touching the code.
        </p>
        <nav className="links" aria-label="Project links">
          <a href={`${DOCS}/start/quick-start/`}>Quick start</a>
          <a href={`${DOCS}/guides/theming/`}>Theming guide</a>
          <a href={REPO}>GitHub</a>
          <a href="https://www.npmjs.com/package/resource-scheduler">npm</a>
        </nav>
      </header>

      <section className="toolbar" aria-label="Appearance">
        <Group label="Theme">
          {THEMES.map((t) => (
            <Choice key={t} on={theme === t} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </Choice>
          ))}
        </Group>
        <Group label="Density">
          {DENSITIES.map((d) => (
            <Choice key={d} on={density === d} onClick={() => setDensity(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </Choice>
          ))}
        </Group>
        <Group label="Accent">
          {(Object.keys(PRESETS) as Preset[]).map((p) => (
            <button
              key={p}
              type="button"
              className="swatch"
              aria-label={p}
              aria-pressed={preset === p}
              title={p}
              style={{ background: PRESETS[p]?.primary ?? "#3b82f6" }}
              onClick={() => setPreset(p)}
            />
          ))}
        </Group>
      </section>

      <div className="tabs" role="tablist" aria-label="Recipes">
        {RECIPES.map((r, i) => (
          <button
            key={r.id}
            id={`tab-${r.id}`}
            type="button"
            role="tab"
            aria-selected={tab === r.id}
            aria-controls="panel"
            tabIndex={tab === r.id ? 0 : -1}
            onClick={() => select(r.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <main id="panel" role="tabpanel" aria-labelledby={`tab-${active.id}`}>
        <div className="panel-head">
          <p>{active.blurb}</p>
          <a href={`${DOCS}/${active.doc}/`}>Read the guide &rarr;</a>
        </div>
        {/* A new key resets the recipe's data when you switch. */}
        <Demo key={active.id} density={density} />
      </main>

      <footer>
        <p>
          Built from the package source on <code>main</code>, so this is the current code, not the last release.{" "}
          <a href={`${REPO}/tree/main/resource-scheduler-example`}>See how this page is made</a>. MIT licensed.
        </p>
      </footer>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group" role="group" aria-label={label}>
      <span className="group-label">{label}</span>
      <div className="group-body">{children}</div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="choice" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
