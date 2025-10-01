// src/components/ResourceScheduler/TimelineHeader.tsx
import React from "react";
import { format } from "date-fns";
import { TimelineHeaderProps } from "./types";
import { isToday } from "./utils/dateUtils";

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  viewType,
  timeColumnWidth = "90px",
  dateColumnWidth = "140px",
  getTimeSlots,
  getDatesInView,
}) => {
  const slots = viewType === "day" ? getTimeSlots() : getDatesInView();

  return (
    <div
      className="grid sticky top-0 z-10 bg-ocrs-background"
      style={{
        gridTemplateColumns:
          viewType === "day"
            ? `repeat(24, ${timeColumnWidth})`
            : `repeat(${slots.length}, ${dateColumnWidth})`,
      }}
    >
      {slots.map((slot, i) => (
        <div
          key={i}
          className={`p-2 text-center border-b h-14 flex flex-col items-center justify-center border-r ${
            isToday(slot) ? "bg-ocrs-blue-50" : "bg-ocrs-gray-50"
          }`}
        >
          {viewType === "day" ? (
            <>
              <span
                className={`text-xs font-medium ${
                  isToday(slot) ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {format(slot, "ha")}
              </span>
              <span
                className={`text-xs ${
                  isToday(slot) ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {format(slot, "EEE")}
              </span>
            </>
          ) : (
            <div className="group flex flex-col items-center">
              <span
                className={`text-xs font-medium ${
                  isToday(slot) ? "text-blue-600" : "text-gray-500"
                } uppercase`}
              >
                {format(slot, "EEE")}
              </span>
              <span
                className={`text-sm font-medium ${
                  isToday(slot) ? "text-blue-700" : "text-gray-700"
                }`}
              >
                {format(slot, "d")}
              </span>
              {(i === 0 || slot.getDate() === 1) && (
                <span
                  className={`text-xs ${
                    isToday(slot) ? "text-blue-500" : "text-gray-400"
                  }`}
                >
                  {format(slot, "MMM")}
                </span>
              )}
              <span className="absolute mt-8 px-2 py-1 rounded bg-ocrs-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {format(slot, "MMMM yyyy")}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
