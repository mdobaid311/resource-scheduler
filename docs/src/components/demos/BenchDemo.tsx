import { useMemo } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource } from "@scheduler/types";

// Deterministic generator so every run measures the same data.
const rand = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const makeResources = (rows: number, perRow: number): Resource[] => {
  const next = rand(42);
  const monday = new Date(2026, 9, 5);
  return Array.from({ length: rows }, (_, i) => ({
    id: `r${i}`,
    name: `Resource ${i}`,
    events: Array.from({ length: perRow }, (_, j) => {
      const day = Math.floor(next() * 7);
      const start = new Date(monday);
      start.setDate(start.getDate() + day);
      start.setHours(8 + Math.floor(next() * 8));
      const end = new Date(start);
      end.setHours(start.getHours() + 1 + Math.floor(next() * 3));
      return { id: `e${i}-${j}`, title: `Event ${j}`, startDate: start, endDate: end };
    }),
  }));
};

/** Benchmark page only: renders N resources and reports when it has painted. */
export default function BenchDemo() {
  const params = new URLSearchParams(window.location.search);
  const rows = Number(params.get("rows") ?? 50);
  const perRow = Number(params.get("events") ?? 5);
  // ?virtualize=false renders every row, for the before/after comparison.
  const virtualize = params.get("virtualize") === "false" ? false : undefined;
  const resources = useMemo(() => makeResources(rows, perRow), [rows, perRow]);
  return (
    <div style={{ height: 700 }} data-bench-root>
      <ResourceScheduler
        resources={resources}
        initialDate={new Date(2026, 9, 7)}
        initialView={ViewType.Week}
        eventOverlap={false}
        virtualize={virtualize}
        onEventDrop={() => {}}
      />
    </div>
  );
}
