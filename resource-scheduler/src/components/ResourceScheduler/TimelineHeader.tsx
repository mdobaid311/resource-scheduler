// src/components/ResourceScheduler/TimelineHeader.tsx
import React from "react";
import { useClassNames, withClass } from "./classNames";
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
}) => {
  const { fmt } = useI18n();
  const classNames = useClassNames();
  const slots = viewType === "day" ? getTimeSlots() : getDatesInView();

  return (
    <div
      className="grid sticky top-0 z-10 bg-ocrs-background"
      style={{
        gridTemplateColumns: `repeat(${slots.length}, ${
          viewType === "day" ? timeColumnWidth : dateColumnWidth
        })`,
      }}
    >
      {slots.map((slot, i) => (
        <div
          key={i}
          className={withClass(
            `p-2 text-center border-b h-14 flex flex-col items-center justify-center border-e ${
              isToday(slot) ? "bg-ocrs-blue-50" : "bg-ocrs-gray-50"
            }`,
            classNames.dateHeader
          )}
        >
          {renderDateHeader ? (
            renderDateHeader(slot, viewType)
          ) : viewType === "day" ? (
            <>
              <span
                className={`text-xs font-medium ${
                  isToday(slot) ? "text-blue-600" : "text-ocrs-muted-foreground"
                }`}
              >
                {fmt.hourHeader(slot)}
              </span>
              <span
                className={`text-xs ${
                  isToday(slot) ? "text-blue-500" : "text-ocrs-muted-foreground"
                }`}
              >
                {fmt.weekday(slot)}
              </span>
            </>
          ) : (
            <div className="group flex flex-col items-center">
              <span
                className={`text-xs font-medium ${
                  isToday(slot) ? "text-blue-600" : "text-ocrs-muted-foreground"
                } uppercase`}
              >
                {fmt.weekday(slot)}
              </span>
              <span
                className={`text-sm font-medium ${
                  isToday(slot) ? "text-blue-700" : "text-ocrs-foreground"
                }`}
              >
                {fmt.dayOfMonth(slot)}
              </span>
              {(i === 0 || slot.getDate() === 1) && (
                <span
                  className={`text-xs ${
                    isToday(slot) ? "text-blue-500" : "text-ocrs-muted-foreground"
                  }`}
                >
                  {fmt.monthShort(slot)}
                </span>
              )}
              <span className="absolute mt-8 px-2 py-1 rounded bg-ocrs-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {fmt.monthYear(slot)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
