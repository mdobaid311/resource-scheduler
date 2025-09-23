// src/components/ResourceScheduler/SchedulerControls.tsx
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { SchedulerControlsProps, ViewType } from "./types";

export const SchedulerControls: React.FC<SchedulerControlsProps> = ({
  currentDate,
  viewType,
  onNavigate,
  onViewChange,
  onGoToToday,
  allowViewChange = true,
}) => {
  const getDateTitle = () => {
    switch (viewType) {
      case ViewType.Day:
        return format(currentDate, "MMMM d, yyyy");
      case ViewType.Week:
        return `${format(startOfWeek(currentDate), "MMM d")} – ${format(
          endOfWeek(currentDate),
          "MMM d, yyyy"
        )}`;
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
    <div className="flex lg:flex-row flex-col items-center justify-between gap-4 p-4 bg-white rounded-t-lg border-b sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between lg:justify-start w-full gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-gray-100 rounded-lg"
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center px-2">
            <span className="text-base md:text-lg font-semibold text-gray-800">
              {getDateTitle()}
            </span>
            <span className="text-xs text-gray-500 font-medium mt-1">
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)} View
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hover:bg-gray-100 rounded-lg"
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-white hover:bg-gray-50"
          onClick={onGoToToday}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Today</span>
        </Button>
      </div>

      {allowViewChange && (
        <Select value={viewType} onValueChange={onViewChange}>
          <SelectTrigger className="lg:w-[140px] w-full bg-white">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent style={{ zIndex: 99 }}>
            <SelectItem value={ViewType.Day}>Day</SelectItem>
            <SelectItem value={ViewType.Week}>Week</SelectItem>
            <SelectItem value={ViewType.Month}>Month</SelectItem>
            <SelectItem value={ViewType.Quarter}>Quarter</SelectItem>
            <SelectItem value={ViewType.Year}>Year</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
