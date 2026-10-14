// src/components/ResourceScheduler/TimelineHeader.tsx
import React from "react";
import { useClassNames, withClass } from "./classNames";
import { useClock } from "./clock";
import { useComponents } from "./components";
import { useI18n } from "./i18n";
import type { TimelineHeaderProps } from "./types";
import { isToday } from "./utils/dateUtils";

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  viewType,
  timeColumnWidth = "90px",
  dateColumnWidth = "140px",
  getTimeSlots,
  getDatesInView,
  renderDateHeader,
  colRange,
}) => {
  const { fmt } = useI18n();
  const classNames = useClassNames();
  const { DateHeader } = useComponents();
  const now = useClock()();
  const slots = viewType === "day" ? getTimeSlots() : getDatesInView();

  return (
    <div
      className="rs-header grid sticky top-0 z-10 bg-ocrs-muted"
      style={{
        gridTemplateColumns: `repeat(${slots.length}, minmax(${
          viewType === "day" ? timeColumnWidth : dateColumnWidth
        }, 1fr))`,
      }}
    >
      {slots.map((slot, i) => {
        if (colRange && (i < colRange.start || i >= colRange.end)) return null;
        // In the day view every column is today, so only the other views mark it.
        const today = viewType !== "day" && isToday(slot, now);
        return (
          <div
            key={i}
            style={colRange ? { gridColumn: i + 1 } : undefined}
            className={withClass(
              `px-1 text-center border-b h-14 flex flex-col items-center justify-center gap-0.5 border-e ${
                today ? "bg-ocrs-blue-50" : "bg-ocrs-muted"
              }`,
              classNames.dateHeader
            )}
          >
            {DateHeader ? (
              <DateHeader date={slot} view={viewType} />
            ) : renderDateHeader ? (
              renderDateHeader(slot, viewType)
            ) : viewType === "day" ? (
              // The date is in the title; whole hours are labelled, the slots between them are quieter.
              <span
                className={`text-xs tabular-nums ${
                  slot.getMinutes() === 0
                    ? "font-semibold text-ocrs-foreground"
                    : "text-ocrs-muted-foreground"
                }`}
              >
                {fmt.hourHeader(slot)}
              </span>
            ) : (
              <div className="group flex flex-col items-center gap-0.5">
                <span
                  className={`text-xs font-semibold ${
                    today ? "text-ocrs-primary-text" : "text-ocrs-foreground"
                  }`}
                >
                  {fmt.weekday(slot)}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    today
                      ? "rounded-full bg-ocrs-primary px-1.5 font-semibold text-ocrs-primary-foreground"
                      : "text-ocrs-muted-foreground"
                  }`}
                >
                  {fmt.dayOfMonth(slot)}
                  {(i === 0 || slot.getDate() === 1) && <> {fmt.monthShort(slot)}</>}
                </span>
                <span className="rs-no-print absolute mt-10 px-2 py-1 rounded-md bg-ocrs-gray-800 text-ocrs-background text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {fmt.monthYear(slot)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
