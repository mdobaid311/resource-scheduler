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
import { useClassNames, withClass } from "./classNames";
import { useI18n } from "./i18n";
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
  const { labels, fmt, locale, dir } = useI18n();
  const classNames = useClassNames();
  // Previous and next point the other way when time runs right to left.
  const arrow = `h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`;

  const getDateTitle = () => {
    switch (viewType) {
      case ViewType.Day:
        return fmt.titleDay(currentDate);
      case ViewType.Week: {
        const days = getDatesInView(currentDate, viewType, {
          weekStartsOn,
          hideWeekends,
        });
        return `${fmt.titleDateStart(days[0])} – ${fmt.titleDateEnd(
          days[days.length - 1]
        )}`;
      }
      case ViewType.Month:
        return fmt.monthYear(currentDate);
      case ViewType.Quarter:
        return fmt.quarterYear(currentDate);
      case ViewType.Year:
        return format(currentDate, "yyyy", { locale });
      default:
        return fmt.titleDay(currentDate);
    }
  };

  return (
    <div
      className={withClass(
        "flex lg:flex-row flex-col items-center justify-between gap-4 p-4 bg-ocrs-white rounded-t-lg border-b sticky top-0 z-30",
        classNames.toolbar
      )}
    >
      <div className="flex items-center justify-between lg:justify-start w-full gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-ocrs-gray-100 rounded-lg"
            aria-label={labels.previousPeriod}
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className={arrow} />
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
              {labels.viewTitle(labels.views[viewType])}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hover:bg-ocrs-gray-100 rounded-lg"
            aria-label={labels.nextPeriod}
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className={arrow} />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-ocrs-white hover:bg-ocrs-gray-50"
          aria-label={labels.today}
          onClick={onGoToToday}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.today}</span>
        </Button>
      </div>

      {allowViewChange && (
        <Select value={viewType} onValueChange={onViewChange} dir={dir}>
          <SelectTrigger
            className="lg:w-[140px] w-full bg-ocrs-white"
            aria-label={labels.view}
          >
            <SelectValue placeholder={labels.view} />
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
                {labels.views[view]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
