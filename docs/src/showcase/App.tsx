import { useEffect, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import EquipmentRentalDemo from "../components/demos/EquipmentRentalDemo";
import FieldServiceDemo from "../components/demos/FieldServiceDemo";
import ProjectAllocationDemo from "../components/demos/ProjectAllocationDemo";
import RoomBookingDemo from "../components/demos/RoomBookingDemo";
import ShiftRosterDemo from "../components/demos/ShiftRosterDemo";
import UtilizationDemo from "../components/demos/UtilizationDemo";
import type { DemoProps } from "../components/demos/Frame";
import { RECIPE_INFO } from "./recipes";
import { ArrowRight, Book, Box, Chart, Clock, Code, Door, Drop, Gantt, Logo, Monitor, Moon, Pin, Sun } from "./icons";

// The showcase lives in the docs site, so links stay on whatever origin and base it is served from.
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const REPO = "https://github.com/mdobaid311/resource-scheduler";

const RECIPES: {
  id: string;
  label: string;
  blurb: string;
  doc: string;
  Icon: ComponentType;
  Demo: ComponentType<DemoProps>;
}[] = [
  { id: "room-booking", ...RECIPE_INFO["room-booking"], Icon: Door, Demo: RoomBookingDemo },
  { id: "shift-roster", ...RECIPE_INFO["shift-roster"], Icon: Clock, Demo: ShiftRosterDemo },
  { id: "equipment-rental", ...RECIPE_INFO["equipment-rental"], Icon: Box, Demo: EquipmentRentalDemo },
  { id: "field-service", ...RECIPE_INFO["field-service"], Icon: Pin, Demo: FieldServiceDemo },
  { id: "project-allocation", ...RECIPE_INFO["project-allocation"], Icon: Gantt, Demo: ProjectAllocationDemo },
  { id: "utilization", ...RECIPE_INFO["utilization"], Icon: Chart, Demo: UtilizationDemo },
];

type Theme = "light" | "dark" | "system";
type Density = "comfortable" | "compact";

// Accent colours for the highlight, the drag footprint and today's column. Dark
// needs its own accent and today shades, so each preset carries both.
const PRESETS = {
  Default: null,
  Violet: { primary: "#7c3aed", accent: ["#ede9fe", "#2e1f5e"], today: ["#f8f6ff", "#1d1840"] },
  Emerald: { primary: "#047857", accent: ["#d1fae5", "#0f3b2e"], today: ["#f2fbf7", "#10261f"] },
  Rose: { primary: "#e11d48", accent: ["#ffe4e6", "#4c1a2a"], today: ["#fff5f6", "#2a1520"] },
  Slate: { primary: "#475569", accent: ["#e2e8f0", "#263247"], today: ["#f6f8fa", "#172033"] },
} as const;
const SWATCH = { Default: "#2563eb", Violet: "#7c3aed", Emerald: "#047857", Rose: "#e11d48", Slate: "#475569" };
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

  // On narrow screens the recipes are a row that scrolls; keep the open one in view.
  useEffect(() => {
    document.getElementById(`tab-${tab}`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [tab]);

  const select = (id: string) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  // The list is a column on wide screens and a row on narrow ones, so both pairs of arrows work.
  const onTabKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = RECIPES[(index + step + RECIPES.length) % RECIPES.length].id;
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const active = RECIPES.find((r) => r.id === tab) ?? RECIPES[0];
  const Demo = active.Demo;

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href={BASE} aria-label="Resource Scheduler docs home">
          <Logo />
          <span>
            Resource<b>Scheduler</b>
          </span>
        </a>

        <p className="nav-label" id="recipes-label">
          Recipes
        </p>
        <div className="nav" role="tablist" aria-labelledby="recipes-label" aria-orientation="vertical">
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
              <r.Icon />
              {r.label}
            </button>
          ))}
        </div>

        <nav className="links" aria-label="Project links">
          <a href={BASE}>
            <Book />
            Docs home
          </a>
          <a href={`${BASE}start/quick-start/`}>
            <Book />
            Quick start
          </a>
          <a href={`${BASE}guides/theming/`}>
            <Drop />
            Theming guide
          </a>
          <a href={REPO}>
            <Code />
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/resource-scheduler">
            <Box />
            npm
          </a>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <p className="tagline">
            A free, MIT resource timeline for React. Six live recipes, one component.
          </p>
          <section className="appearance" aria-label="Appearance">
            <Group label="Theme">
              {THEMES.map((t) => (
                <Choice key={t} on={theme === t} onClick={() => setTheme(t)} label={t[0].toUpperCase() + t.slice(1)}>
                  {t === "light" ? <Sun /> : t === "dark" ? <Moon /> : <Monitor />}
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
            <div className="swatches" role="group" aria-label="Accent">
              {(Object.keys(PRESETS) as Preset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="swatch"
                  aria-label={`${p} accent`}
                  aria-pressed={preset === p}
                  title={p}
                  style={{ background: SWATCH[p] }}
                  onClick={() => setPreset(p)}
                />
              ))}
            </div>
          </section>
        </header>

        <main id="panel" role="tabpanel" aria-labelledby={`tab-${active.id}`}>
          <div className="page-head">
            <div>
              <h1>{active.label}</h1>
              <p>{active.blurb}</p>
            </div>
            <a className="primary-button" href={`${BASE}${active.doc}/`}>
              Read the guide
              <ArrowRight />
            </a>
          </div>
          {/* A new key resets the recipe's data when you switch. */}
          <Demo key={active.id} density={density} />
        </main>

        <footer>
          Built from the package source on <code>main</code>, so this is the current code, not the last release.{" "}
          <a href={`${REPO}/tree/main/docs/src/showcase`}>See how this page is made</a>. MIT licensed.
        </footer>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function Choice({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}
