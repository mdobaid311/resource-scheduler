// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as headless from "./headless";

// resource-scheduler/headless: the logic of the scheduler without any UI. It has
// to load in a server, a worker or another framework, so these tests run in a
// plain Node environment (no window, no document) and read the source graph.

// Every runtime export, grouped the way the reference page groups them.
const VALUES = [
  // Views and columns
  "ViewType",
  "resolveSlotOptions",
  "getTimeSlots",
  "getDatesInView",
  "getColumns",
  "getColumnRange",
  "getVisibleRange",
  "navigateDate",
  "isToday",
  // Resources and events
  "withEvents",
  "expandRecurrence",
  "expandEvents",
  "getVisibleEvents",
  "getVisibleResources",
  "withGroups",
  "isGroupRow",
  "GROUP_ROW_HEIGHT",
  // Layout
  "getEventSpan",
  "getEventStartPosition",
  "layoutEvents",
  "getRowHeight",
  "getRowHeightFromLayout",
  "getRowHeights",
  "getGridTemplateRows",
  "getTimePosition",
  "LANES",
  "ROW_PADDING",
  "UTILIZATION_ROW_HEIGHT",
  "COLUMN_UTILIZATION_HEIGHT",
  "getRowWindow",
  "getColumnWindow",
  "parsePx",
  // Drag, resize and selection
  "getDropRange",
  "getResizeRange",
  "getSelectionBounds",
  "isSlotInRange",
  "getSelectedColumns",
  "getMovePlacement",
  "getResizePlacement",
  "isSamePlacement",
  "stepPlacement",
  "moveCursor",
  "flipHorizontal",
  // Rules, availability and utilization
  "isPlacementAllowed",
  "rangesOverlap",
  "isCellUnavailable",
  "touchesUnavailable",
  "resolveBusinessHours",
  "findAvailableSlots",
  "getUtilization",
  "columnUtilization",
  "groupUtilization",
  // State
  "createSchedulerStore",
  // Time zones
  "utcToZoned",
  "zonedToUtc",
  "isValidTimeZone",
  // Text
  "buildI18n",
  "defaultLabels",
  "formatPeriodTitle",
  "formatSlotLabel",
  "formatRangeLabel",
  "formatEventTime",
];

// Types cannot be listed at run time; they are checked against the reference page.
const TYPES = [
  "SchedulerEvent",
  "Resource",
  "ResourceInput",
  "Recurrence",
  "BusinessHours",
  "UnavailableRange",
  "SlotSelection",
  "VisibleRange",
  "SlotOptions",
  "ViewOptions",
  "Placement",
  "PlacementRules",
  "Utilization",
  "GroupRow",
  "EventPosition",
  "RowHeightOptions",
  "DragTarget",
  "SchedulerInput",
  "SchedulerState",
  "SchedulerStore",
  "SchedulerStoreInput",
  "FindSlotsOptions",
  "Step",
  "StepContext",
  "Cursor",
  "Density",
  "SchedulerLabels",
  "PartialLabels",
  "I18nInput",
  "Formatter",
  "ResolvedI18n",
];

describe("resource-scheduler/headless", () => {
  it("exports the documented functions and nothing else", () => {
    expect(Object.keys(headless).sort()).toEqual([...VALUES].sort());
  });

  it("documents every export on the reference page", () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, "../../docs/src/content/docs/reference/headless.mdx"),
      "utf8"
    );
    const undocumented = [...VALUES, ...TYPES].filter((name) => !page.includes(`\`${name}\``));
    expect(undocumented).toEqual([]);
  });

  it("builds a whole view from the functions alone", () => {
    const { ViewType } = headless;
    const day = new Date(2026, 9, 7); // Wednesday
    const resources = [
      {
        id: "a",
        name: "Ann",
        events: [
          { id: "1", title: "Standup", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) },
          { id: "2", title: "Review", startDate: new Date(2026, 9, 7, 9, 30), endDate: new Date(2026, 9, 7, 11) },
        ],
      },
      { id: "b", name: "Bo", events: [] },
    ];
    const options = { dayStartHour: 8, dayEndHour: 18 };

    const columns = headless.getColumns(day, ViewType.Day, options);
    const rows = headless.getVisibleResources(resources, day, ViewType.Day, options);
    const [ann, bo] = rows.map((row) => headless.layoutEvents(row.events, columns, ViewType.Day));

    expect(columns).toHaveLength(10);
    expect(ann.map((p) => [p.event.id, p.startPosition, p.span, p.lane])).toEqual([
      ["1", 1, 1, 0],
      ["2", 1, 2, 1],
    ]);
    expect(bo).toEqual([]);
    expect(headless.getRowHeights(rows, columns, ViewType.Day)).toEqual([112, 60]);
    expect(headless.formatPeriodTitle(day, ViewType.Day)).toBe("October 7, 2026");
    expect(headless.formatPeriodTitle(headless.navigateDate(day, ViewType.Week, "next"), ViewType.Week)).toBe(
      "Oct 11 – Oct 17, 2026"
    );
  });
});

describe("what the headless entry may import", () => {
  const SRC = __dirname;
  const IMPORT = /(?:^|\n)[ \t]*(import|export)(\s+type)?\b[^;]*?\bfrom\s*["']([^"']+)["']|(?:^|\n)[ \t]*import\s*["']([^"']+)["']/g;

  // The files the entry reaches at run time, and the packages they import.
  const graph = () => {
    const files = new Set<string>();
    const packages = new Set<string>();
    const visit = (file: string) => {
      if (files.has(file)) return;
      files.add(file);
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(IMPORT)) {
        if (match[2]) continue; // `import type` is erased at build time
        const spec = match[3] ?? match[4];
        if (!spec.startsWith(".")) {
          packages.add(spec);
          continue;
        }
        const base = path.resolve(path.dirname(file), spec);
        const found = [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find((f) => fs.existsSync(f));
        if (!found) throw new Error(`${path.relative(SRC, file)} imports ${spec}, which does not resolve`);
        visit(found);
      }
    };
    visit(path.join(SRC, "headless.ts"));
    return { files: [...files], packages: [...packages] };
  };

  it("needs only date-fns: no React, UI library, styles or DOM", () => {
    const { packages } = graph();
    expect(packages.filter((name) => !/^date-fns(\/|$)/.test(name))).toEqual([]);
  });

  it("reaches no stylesheet and no client component", () => {
    for (const file of graph().files) {
      const text = fs.readFileSync(file, "utf8");
      expect(file, "a client module").not.toMatch(/\.(tsx|css)$/);
      expect(text.trimStart().startsWith('"use client"'), `${path.relative(SRC, file)} says "use client"`).toBe(false);
    }
  });
});
