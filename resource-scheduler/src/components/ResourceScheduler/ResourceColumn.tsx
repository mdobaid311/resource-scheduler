// src/components/ResourceScheduler/ResourceColumn.tsx
import { ChevronDown, GripVertical } from "./icons";
import React, { useRef, useState } from "react";
import { useClassNames, withClass } from "./classNames";
import { ColumnUtilizationLabel } from "./ColumnUtilization";
import { useComponents } from "./components";
import { useDensity } from "./density";
import { HEADER_HEIGHT, useReorder } from "./hooks/useReorder";
import { useI18n } from "./i18n";
import type { ResourceColumnProps } from "./types";
import { isGroupRow } from "./utils/groups";
import type { ReorderDrag } from "./utils/reorder";
import { type Utilization, utilizationTone } from "./utils/utilization";

const KEYS = "Alt+ArrowUp Alt+ArrowDown";

// The grip that starts a drag. Decorative for assistive technology: the keyboard moves rows with Alt+Arrow.
const Handle: React.FC<{ onPointerDown: (event: React.PointerEvent) => void; className?: string }> = ({
  onPointerDown,
  className = "",
}) => {
  const { labels } = useI18n();
  return (
    <span
      data-rs-handle
      aria-hidden="true"
      title={labels.dragToReorder}
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      className={`shrink-0 cursor-grab touch-none text-ocrs-muted-foreground hover:text-ocrs-primary ${className}`}
    >
      <GripVertical className="size-4" />
    </span>
  );
};

const hours = (minutes: number) => Math.round(minutes / 6) / 10;

// The bar's colour: primary, amber from 90%, red above 100%.
const BAR = { normal: "bg-ocrs-primary", high: "bg-ocrs-warning", over: "bg-ocrs-destructive" } as const;

// A bar and a percentage; the bar stops at 100% and turns red above it.
const UtilizationBar: React.FC<{ value: Utilization }> = ({ value }) => {
  const { labels } = useI18n();
  // From the minutes, not the ratio: 0.575 * 100 is 57.49999999999999.
  const percent =
    value.ratio === null ? null : Math.round((value.bookedMinutes * 100) / value.availableMinutes);
  const filled = Math.min(percent ?? 0, 100);
  const label = labels.utilization(hours(value.bookedMinutes), hours(value.availableMinutes));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={filled}
      title={label}
      className="mt-1 flex w-full items-center gap-2"
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ocrs-secondary">
        <div
          className={`h-full rounded-full ${BAR[utilizationTone(percent)]}`}
          style={{ width: filled + "%" }}
        />
      </div>
      <span
        className={`w-9 text-end text-xs tabular-nums ${
          utilizationTone(percent) === "over" ? "font-semibold text-ocrs-foreground" : "text-ocrs-muted-foreground"
        }`}
      >
        {percent === null ? "–" : percent + "%"}
      </span>
    </div>
  );
};

export const ResourceColumn: React.FC<ResourceColumnProps> = ({
  resources,
  resourceColumnWidth = "220px",
  getResourceRowHeight,
  renderResourceHeader,
  utilization,
  onToggleGroup,
  rowRange,
  showColumnUtilization,
  reorder: control,
  announce,
  reorderHelpId,
}) => {
  const { labels } = useI18n();
  const classNames = useClassNames();
  const { ResourceHeader } = useComponents();
  const density = useDensity();
  // Rows outside the range are not rendered; spacers keep the column tall.
  const heights = resources.map(getResourceRowHeight);
  const start = rowRange?.start ?? 0;
  const end = rowRange?.end ?? resources.length;
  const sum = (from: number, to: number) =>
    heights.slice(from, to).reduce((total, h) => total + h, 0);
  const before = sum(0, start);
  const after = sum(end, heights.length);

  const rootRef = useRef<HTMLDivElement>(null);
  const { active, isDragged, press, keys } = useReorder({ rows: resources, heights, control, announce, rootRef });
  // Resource cells are one tab stop, the last one focused (else the first drawn); arrows move between them.
  const [stop, setStop] = useState<string>();
  const drawn = resources.slice(start, end).filter((r) => !isGroupRow(r));
  const tabStop = drawn.some((r) => r.id === stop) ? stop : drawn[0]?.id;
  const line = active?.target?.line;

  return (
    <div
      ref={rootRef}
      // The `after` line carries the column's edge down past the last row.
      className="rs-resources bg-ocrs-white z-20 sticky start-0 flex shrink-0 flex-col [&>*]:shrink-0 after:pointer-events-none after:absolute after:inset-y-0 after:end-0 after:w-px after:bg-ocrs-border"
      style={{ width: resourceColumnWidth }}
    >
      <div className="rs-resources-head border-e sticky top-0 z-10 bg-ocrs-muted px-4 border-b h-14 flex items-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-ocrs-muted-foreground">{labels.resources}</span>
      </div>
      {before > 0 && <div aria-hidden="true" style={{ height: before + "px" }} />}
      {resources.slice(start, end).map((resource, i) => {
        const rowHeight = heights[start + i];
        if (isGroupRow(resource)) {
          const { name, key, depth, count, collapsed } = resource.groupHeader;
          // With showUtilization a header adds up everything below it, folded or not.
          const total = utilization?.get(resource.id);
          const totalPercent =
            total && total.ratio !== null ? Math.round((total.bookedMinutes * 100) / total.availableMinutes) : null;
          const label = total
            ? `${labels.group(name, count)}, ${labels.utilization(hours(total.bookedMinutes), hours(total.availableMinutes))}`
            : labels.group(name, count);
          // Each level of nesting steps in; the first level keeps the default padding.
          const indent = depth ? { paddingInlineStart: 16 + depth * 16 } : undefined;
          const drag: ReorderDrag = { kind: "group", key };
          const grip = control?.groups;
          const body = (
            <>
              {grip && <Handle onPointerDown={press(drag)} />}
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 ${collapsed ? "-rotate-90 rtl:rotate-90" : ""}`}
              />
              <span className="truncate">{name}</span>
              {total && (
                <span aria-hidden="true" className="ms-auto flex items-center gap-2 text-xs font-normal text-ocrs-muted-foreground">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-ocrs-secondary">
                    <span
                      className={`block h-full rounded-full ${BAR[utilizationTone(totalPercent)]}`}
                      style={{ width: Math.min(totalPercent ?? 0, 100) + "%" }}
                    />
                  </span>
                  <span className="w-9 text-end tabular-nums">{totalPercent === null ? "–" : totalPercent + "%"}</span>
                </span>
              )}
              <span aria-hidden="true" className={`${total ? "" : "ms-auto "}text-xs text-ocrs-muted-foreground`}>
                {count}
              </span>
            </>
          );
          // Dragged rows dim; a resource dropped on a header gets a ring, as it joins that group.
          const cell = `border-0 border-b border-e bg-ocrs-muted text-sm font-semibold text-ocrs-foreground flex items-center gap-2 overflow-hidden${
            isDragged(resource) ? " opacity-50" : ""
          }${active?.target?.header === resource.id ? " ring-2 ring-inset ring-ocrs-primary" : ""}`;
          return onToggleGroup ? (
            <button
              key={resource.id}
              type="button"
              aria-expanded={!collapsed}
              aria-label={label}
              onClick={() => onToggleGroup(key)}
              {...(grip && {
                "data-rs-row": resource.id,
                "aria-keyshortcuts": KEYS,
                "aria-describedby": reorderHelpId,
                onKeyDown: keys(drag),
              })}
              className={withClass(
                `${cell} w-full px-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocrs-ring`,
                classNames.groupHeader
              )}
              style={{ height: rowHeight + "px", ...indent }}
            >
              {body}
            </button>
          ) : (
            <div
              key={resource.id}
              aria-label={label}
              className={withClass(`${cell} px-4`, classNames.groupHeader)}
              style={{ height: rowHeight + "px", ...indent }}
            >
              {body}
            </div>
          );
        }
        const value = utilization?.get(resource.id);
        const drag: ReorderDrag = { kind: "resource", id: resource.id };
        const grip = control?.resources;
        return (
          <div
            key={resource.id}
            {...(grip && {
              "data-rs-row": resource.id,
              tabIndex: resource.id === tabStop ? 0 : -1,
              "aria-keyshortcuts": KEYS,
              "aria-describedby": reorderHelpId,
              onKeyDown: keys(drag),
              onFocus: () => setStop(resource.id),
            })}
            className={withClass(
              `${
                value ? "py-0.5" : density === "compact" ? "py-1" : "py-2"
              } px-4 border-b border-e flex flex-col justify-center text-start overflow-hidden bg-ocrs-white text-sm${
                grip ? " relative ps-7 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocrs-ring" : ""
              }${isDragged(resource) ? " opacity-50" : ""}`,
              classNames.resourceCell
            )}
            style={{ height: rowHeight + "px" }}
          >
            {grip && <Handle onPointerDown={press(drag)} className="absolute start-2 top-1/2 -translate-y-1/2" />}
            {ResourceHeader ? (
              <ResourceHeader resource={resource} />
            ) : renderResourceHeader ? (
              renderResourceHeader(resource)
            ) : (
              <>
                <span
                  // Two lines of name and a role do not fit a row; never cut one through.
                  className={`${resource.role ? "line-clamp-1" : "line-clamp-2"} break-words whitespace-pre-line font-medium leading-5 text-ocrs-foreground`}
                >
                  {resource.name}
                </span>
                {resource.role && (
                  <span className="block truncate text-xs leading-4 text-ocrs-muted-foreground">{resource.role}</span>
                )}
              </>
            )}
            {value && <UtilizationBar value={value} />}
          </div>
        );
      })}
      {after > 0 && <div aria-hidden="true" style={{ height: after + "px" }} />}
      {showColumnUtilization && (
        <>
          {/* Pushes the label down to the totals row when the rows are few. */}
          <div data-rs-spacer aria-hidden="true" className="flex-1" />
          <ColumnUtilizationLabel />
        </>
      )}
      {line !== undefined && (
        <div
          data-rs-drop-line
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-ocrs-primary"
          style={{ top: HEADER_HEIGHT + line - 1 }}
        />
      )}
    </div>
  );
};
