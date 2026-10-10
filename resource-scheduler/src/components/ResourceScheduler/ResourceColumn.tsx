// src/components/ResourceScheduler/ResourceColumn.tsx
import { ChevronDown } from "lucide-react";
import React from "react";
import { useClassNames, withClass } from "./classNames";
import { useI18n } from "./i18n";
import type { ResourceColumnProps } from "./types";
import { isGroupRow } from "./utils/groups";
import type { Utilization } from "./utils/utilization";

const hours = (minutes: number) => Math.round(minutes / 6) / 10;

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
      className="flex w-full items-center gap-2"
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ocrs-secondary">
        <div
          className={`h-full ${percent !== null && percent > 100 ? "bg-ocrs-destructive" : "bg-ocrs-primary"}`}
          style={{ width: filled + "%" }}
        />
      </div>
      <span className="w-9 text-end text-xs tabular-nums text-ocrs-muted-foreground">
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
}) => {
  const { labels } = useI18n();
  const classNames = useClassNames();
  // Rows outside the range are not rendered; spacers keep the column tall.
  const heights = resources.map(getResourceRowHeight);
  const start = rowRange?.start ?? 0;
  const end = rowRange?.end ?? resources.length;
  const sum = (from: number, to: number) =>
    heights.slice(from, to).reduce((total, h) => total + h, 0);
  const before = sum(0, start);
  const after = sum(end, heights.length);

  return (
    <div
      className="bg-ocrs-white z-20 sticky start-0 shrink-0"
      style={{ width: resourceColumnWidth }}
    >
      <div className="border-e bg-ocrs-background sticky top-0 z-10 bg-ocrs-gray-50 p-2 text-center border-b h-14 flex items-center justify-center">
        <span className="text-sm font-medium text-ocrs-muted-foreground">{labels.resources}</span>
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
          const indent = depth ? { paddingInlineStart: 12 + depth * 16 } : undefined;
          const body = (
            <>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 ${collapsed ? "-rotate-90 rtl:rotate-90" : ""}`}
              />
              <span className="truncate">{name}</span>
              {total && (
                <span aria-hidden="true" className="ms-auto flex items-center gap-2 text-xs font-normal text-ocrs-muted-foreground">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-ocrs-secondary">
                    <span
                      className={`block h-full ${totalPercent !== null && totalPercent > 100 ? "bg-ocrs-destructive" : "bg-ocrs-primary"}`}
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
          const cell = "border-b border-e bg-ocrs-muted text-sm font-medium flex items-center gap-2 overflow-hidden";
          return onToggleGroup ? (
            <button
              key={resource.id}
              type="button"
              aria-expanded={!collapsed}
              aria-label={label}
              onClick={() => onToggleGroup(key)}
              className={withClass(
                `${cell} w-full px-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocrs-ring`,
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
              className={withClass(`${cell} px-3`, classNames.groupHeader)}
              style={{ height: rowHeight + "px", ...indent }}
            >
              {body}
            </div>
          );
        }
        const value = utilization?.get(resource.id);
        return (
          <div
            key={resource.id}
            className={withClass(
              `${
                value ? "p-2 flex-col gap-1" : "p-3"
              } border-b border-e flex items-center justify-center text-center overflow-hidden bg-ocrs-white hover:bg-ocrs-accent text-sm`,
              classNames.resourceCell
            )}
            style={{ height: rowHeight + "px" }}
          >
            {renderResourceHeader ? (
              renderResourceHeader(resource)
            ) : (
              <span className="w-full block break-words whitespace-pre-line">
                {resource.name}
              </span>
            )}
            {value && <UtilizationBar value={value} />}
          </div>
        );
      })}
      {after > 0 && <div aria-hidden="true" style={{ height: after + "px" }} />}
    </div>
  );
};
