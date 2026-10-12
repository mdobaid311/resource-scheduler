import { useMemo, useState } from "react";
import {
  LANES,
  ViewType,
  buildI18n,
  formatEventTime,
  formatPeriodTitle,
  getColumns,
  getGridTemplateRows,
  getRowHeights,
  getUtilization,
  getVisibleRange,
  getVisibleResources,
  isCellUnavailable,
  isToday,
  layoutEvents,
  navigateDate,
} from "@headless";
import type { Resource, SchedulerEvent } from "@headless";
import { Frame } from "./Frame";
import { BLUE, GREEN, teamWeek, week } from "./sample";

// Everything on screen comes from "resource-scheduler/headless" (the @headless
// alias here) and inline styles: no component, no stylesheet of the package.

const VIEWS = [ViewType.Day, ViewType.Week, ViewType.Month] as const;
type DemoView = (typeof VIEWS)[number];
const OPTIONS = { dayStartHour: 8, dayEndHour: 18, weekStartsOn: 1 } as const;
const BUSINESS_HOURS = { startHour: 9, endHour: 17 };
const COLUMN_WIDTH: Record<DemoView, number> = { day: 72, week: 96, month: 40 };
const i18n = buildI18n();

const border = "1px solid var(--sl-color-gray-5)";

const data = (): Resource[] => {
  const [ann, ...others] = teamWeek();
  return [
    {
      ...ann,
      events: [
        ...ann.events,
        // One event that repeats: getVisibleResources draws an occurrence for each weekday in view.
        {
          id: "stand",
          title: "Standup",
          startDate: week(1, 9),
          endDate: week(1, 9, 30),
          color: GREEN,
          recurrence: { freq: "weekly", byWeekday: [1, 2, 3, 4, 5] },
        },
      ],
    },
    ...others,
  ];
};

const button = {
  font: "inherit",
  padding: "0.2rem 0.6rem",
  border,
  borderRadius: 6,
  background: "var(--sl-color-bg)",
  color: "var(--sl-color-text)",
  cursor: "pointer",
} as const;

/** A timeline drawn only from the headless functions. */
export default function HeadlessDemo() {
  const [now] = useState(() => new Date());
  const [date, setDate] = useState(now);
  const [view, setView] = useState<DemoView>(ViewType.Week);
  const [picked, setPicked] = useState<{ event: SchedulerEvent; resource: Resource } | null>(null);
  const [resources] = useState(data);

  // The four steps: columns, resources in view, where each event goes, how tall each row is.
  const columns = useMemo(() => getColumns(date, view, OPTIONS), [date, view]);
  const rows = useMemo(() => getVisibleResources(resources, date, view, OPTIONS), [resources, date, view]);
  const placed = useMemo(() => rows.map((row) => layoutEvents(row.events, columns, view)), [rows, columns, view]);
  const heights = useMemo(() => getRowHeights(rows, columns, view), [rows, columns, view]);
  const range = getVisibleRange(date, view, OPTIONS);
  const { fmt } = i18n;

  return (
    <Frame height={420}>
      <div data-demo="headless" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderBottom: border }}>
          <button type="button" aria-label="Previous period" style={button} onClick={() => setDate(navigateDate(date, view, "prev"))}>
            ‹
          </button>
          <strong data-demo-title style={{ minWidth: "9.5rem", textAlign: "center" }}>
            {formatPeriodTitle(date, view, OPTIONS, i18n)}
          </strong>
          <button type="button" aria-label="Next period" style={button} onClick={() => setDate(navigateDate(date, view, "next"))}>
            ›
          </button>
          <button type="button" style={button} onClick={() => setDate(now)}>
            {i18n.labels.today}
          </button>
          <span role="group" aria-label={i18n.labels.view} style={{ marginInlineStart: "auto", display: "inline-flex", gap: 4 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={v === view}
                style={{ ...button, ...(v === view && { background: "var(--sl-color-accent-low)", borderColor: "var(--sl-color-accent)" }) }}
                onClick={() => setView(v)}
              >
                {i18n.labels.views[v]}
              </button>
            ))}
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${columns.length}, minmax(${COLUMN_WIDTH[view]}px, 1fr))`,
              gridTemplateRows: getGridTemplateRows(heights),
              minWidth: "fit-content",
            }}
          >
            <div style={{ gridRow: 1, gridColumn: 1, position: "sticky", top: 0, left: 0, zIndex: 3, background: "var(--sl-color-bg)", borderBottom: border, padding: "0.5rem", fontSize: "0.8rem" }}>
              {i18n.labels.resources}
            </div>
            {columns.map((column, c) => (
              <div
                key={+column}
                style={{
                  gridRow: 1,
                  gridColumn: c + 2,
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: isToday(column, now) ? "var(--sl-color-accent-low)" : "var(--sl-color-bg)",
                  borderBottom: border,
                  borderInlineStart: border,
                  padding: "0.4rem 0.25rem",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  lineHeight: 1.3,
                }}
              >
                {view === ViewType.Day ? (
                  fmt.hourHeader(column)
                ) : (
                  <>
                    <div>{fmt.weekday(column)}</div>
                    <strong>{fmt.dayOfMonth(column)}</strong>
                  </>
                )}
              </div>
            ))}

            {rows.map((row, r) => {
              const { ratio } = getUtilization(row, range, { businessHours: BUSINESS_HOURS });
              return (
                <div key={row.id} style={{ display: "contents" }}>
                  <div
                    style={{
                      gridRow: r + 2,
                      gridColumn: 1,
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: "var(--sl-color-bg)",
                      borderBottom: border,
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>{row.name}</strong>
                    <div style={{ fontSize: "0.7rem", color: "var(--sl-color-gray-3)" }}>
                      {row.role} · {ratio === null ? "n/a" : `${Math.round(ratio * 100)}% booked`}
                    </div>
                  </div>

                  {columns.map((column, c) => (
                    <div
                      key={+column}
                      style={{
                        gridRow: r + 2,
                        gridColumn: c + 2,
                        borderBottom: border,
                        borderInlineStart: border,
                        background: isCellUnavailable(row, column, { businessHours: BUSINESS_HOURS, viewType: view })
                          ? "var(--sl-color-gray-6)"
                          : undefined,
                      }}
                    />
                  ))}

                  {placed[r].map(({ event, startPosition, span, lane }) => (
                    <button
                      key={event.id}
                      type="button"
                      data-demo-event={event.id}
                      onClick={() => setPicked({ event, resource: row })}
                      style={{
                        gridRow: r + 2,
                        gridColumn: `${startPosition + 2} / span ${span}`,
                        alignSelf: "start",
                        height: LANES.comfortable.card,
                        margin: `${lane * LANES.comfortable.lane + 4}px 2px 0`,
                        padding: "0 0.4rem",
                        border: 0,
                        borderRadius: 6,
                        background: event.color ?? BLUE,
                        color: "#fff",
                        font: "inherit",
                        fontSize: "0.75rem",
                        textAlign: "start",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <p role="status" style={{ margin: 0, padding: "0.4rem 0.75rem", borderTop: border, fontSize: "0.8rem", color: "var(--sl-color-gray-2)" }}>
          {picked
            ? `${picked.event.title}, ${picked.resource.name}: ${formatEventTime(picked.event, i18n)}`
            : "Click an event. Everything here is drawn from the headless functions."}
        </p>
      </div>
    </Frame>
  );
}
