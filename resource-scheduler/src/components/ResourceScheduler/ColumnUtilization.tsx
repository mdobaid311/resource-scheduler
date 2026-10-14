// src/components/ResourceScheduler/ColumnUtilization.tsx
import React from "react";
import { COLUMN_UTILIZATION_HEIGHT } from "./density";
import { useI18n } from "./i18n";
import type { ViewType } from "./types";
import { formatSlotLabel } from "./utils/dateUtils";
import { type Utilization, utilizationTone } from "./utils/utilization";

const hours = (minutes: number) => Math.round(minutes / 6) / 10;

// The bar's colour: primary, amber from 90%, red above 100%.
const BAR = { normal: "bg-ocrs-primary", high: "bg-ocrs-warning", over: "bg-ocrs-destructive" } as const;

/** The name of the row, at the foot of the resource column. It stays in view while the rows scroll. */
export const ColumnUtilizationLabel: React.FC = () => {
  const { labels } = useI18n();
  return (
    <div
      className="rs-totals-label sticky bottom-0 z-10 flex items-center border-e border-t bg-ocrs-muted px-4 text-xs font-semibold uppercase tracking-wide text-ocrs-muted-foreground"
      style={{ height: COLUMN_UTILIZATION_HEIGHT + "px" }}
    >
      {labels.columnUtilization}
    </div>
  );
};

/**
 * The row under the grid: one cell per column with the share of all resources'
 * available time that is booked in it. A cell's bar stops at 100% and turns
 * red above it.
 */
export const ColumnUtilizationRow: React.FC<{
  /** The column dates, as in the grid: slots in the day view, days otherwise. */
  slots: Date[];
  viewType: ViewType;
  values: Utilization[];
  columnWidth: string;
  /** Render only these columns (end exclusive). */
  colRange?: { start: number; end: number };
}> = ({ slots, viewType, values, columnWidth, colRange }) => {
  const i18n = useI18n();
  const { labels } = i18n;
  return (
    <div
      role="group"
      aria-label={labels.columnUtilization}
      className="rs-totals sticky bottom-0 z-10 grid shrink-0 border-t bg-ocrs-white"
      style={{
        gridTemplateColumns: `repeat(${slots.length}, minmax(${columnWidth}, 1fr))`,
        height: COLUMN_UTILIZATION_HEIGHT + "px",
      }}
    >
      {slots.map((slot, i) => {
        if (colRange && (i < colRange.start || i >= colRange.end)) return null;
        const value = values[i];
        // From the minutes, not the ratio: 0.575 * 100 is 57.49999999999999.
        const percent =
          !value || value.ratio === null ? null : Math.round((value.bookedMinutes * 100) / value.availableMinutes);
        const filled = Math.min(percent ?? 0, 100);
        const label = `${formatSlotLabel(slot, viewType, i18n)}, ${labels.utilization(
          hours(value?.bookedMinutes ?? 0),
          hours(value?.availableMinutes ?? 0)
        )}`;
        return (
          <div
            key={i}
            style={colRange ? { gridColumn: i + 1 } : undefined}
            role="meter"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={filled}
            title={label}
            className="flex flex-col items-center justify-center gap-1 border-e px-1"
          >
            <span className="text-xs tabular-nums text-ocrs-muted-foreground">
              {percent === null ? "–" : percent + "%"}
            </span>
            <span className="h-1.5 w-full max-w-12 overflow-hidden rounded-full bg-ocrs-secondary">
              <span
                className={`block h-full rounded-full ${BAR[utilizationTone(percent)]}`}
                style={{ width: filled + "%" }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
};
