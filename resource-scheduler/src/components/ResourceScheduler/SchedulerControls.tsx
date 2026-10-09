// src/components/ResourceScheduler/SchedulerControls.tsx
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { type SchedulerControlsProps, ViewType } from "./types";
import { getDatesInView } from "./utils/dateUtils";

export const SchedulerControls: React.FC<SchedulerControlsProps> = ({
  currentDate,
  viewType,
  onNavigate,
  onViewChange,
  onGoToToday,
  allowViewChange = true,
  availableViews,
  weekStartsOn,
  hideWeekends,
}) => {
  const getDateTitle = () => {
    switch (viewType) {
      case ViewType.Day:
        return format(currentDate, "MMMM d, yyyy");
      case ViewType.Week: {
        const days = getDatesInView(currentDate, viewType, {
          weekStartsOn,
          hideWeekends,
        });
        return `${format(days[0], "MMM d")} – ${format(
          days[days.length - 1],
          "MMM d, yyyy"
        )}`;
      }
      case ViewType.Month:
        return format(currentDate, "MMMM yyyy");
      case ViewType.Quarter:
        return `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${format(
          currentDate,
          "yyyy"
        )}`;
      case ViewType.Year:
        return format(currentDate, "yyyy");
      default:
        return format(currentDate, "MMMM d, yyyy");
    }
  };

  return (
    <div className="flex lg:flex-row flex-col items-center justify-between gap-4 p-4 bg-ocrs-white rounded-t-lg border-b sticky top-0 z-30">
      <div className="flex items-center justify-between lg:justify-start w-full gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-ocrs-gray-100 rounded-lg"
            aria-label="Previous period"
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Announces the new period when the user navigates. */}
          <div
            className="flex flex-col items-center px-2 flex-1 min-w-0"
            aria-live="polite"
          >
            <span className="text-base md:text-lg font-semibold text-ocrs-foreground text-center truncate">
              {getDateTitle()}
            </span>
            <span className="text-xs text-ocrs-muted-foreground font-medium mt-1 text-center">
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)} View
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hover:bg-ocrs-gray-100 rounded-lg"
            aria-label="Next period"
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-ocrs-white hover:bg-ocrs-gray-50"
          aria-label="Today"
          onClick={onGoToToday}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Today</span>
        </Button>
      </div>

      {allowViewChange && (
        <Select value={viewType} onValueChange={onViewChange}>
          <SelectTrigger
            className="lg:w-[140px] w-full bg-ocrs-white"
            aria-label="View"
          >
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent style={{ zIndex: 99 }}>
            {(
              availableViews ?? [
                ViewType.Day,
                ViewType.Week,
                ViewType.Month,
                ViewType.Quarter,
                ViewType.Year,
              ]
            ).map((view) => (
              <SelectItem key={view} value={view}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
