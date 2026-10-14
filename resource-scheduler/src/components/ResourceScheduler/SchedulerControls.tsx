// src/components/ResourceScheduler/SchedulerControls.tsx
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { useClassNames, withClass } from "./classNames";
import { useComponents } from "./components";
import { useI18n } from "./i18n";
import { type SchedulerControlsProps, ViewType } from "./types";
import { formatPeriodTitle } from "./utils/dateUtils";

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
  const { Toolbar } = useComponents();
  // Previous and next point the other way when time runs right to left.
  const arrow = `h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`;

  const getDateTitle = () =>
    formatPeriodTitle(currentDate, viewType, { weekStartsOn, hideWeekends }, { fmt, locale });

  const views = availableViews ?? [
    ViewType.Day,
    ViewType.Week,
    ViewType.Month,
    ViewType.Quarter,
    ViewType.Year,
  ];

  if (Toolbar) {
    return (
      <Toolbar
        currentDate={currentDate}
        viewType={viewType}
        onNavigate={onNavigate}
        onViewChange={onViewChange}
        onGoToToday={onGoToToday}
        allowViewChange={allowViewChange}
        availableViews={availableViews}
        weekStartsOn={weekStartsOn}
        hideWeekends={hideWeekends}
        title={getDateTitle()}
        viewTitle={labels.viewTitle(labels.views[viewType])}
        views={views}
        labels={labels}
        dir={dir}
      />
    );
  }

  // One button per view; on a narrow screen the row scrolls sideways.
  const viewSwitch = !allowViewChange ? null : (
    <div
      role="group"
      aria-label={labels.view}
      className="rs-no-print inline-flex max-w-full items-center gap-0.5 overflow-auto rounded-lg bg-ocrs-secondary p-0.5"
    >
      {views.map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={view === viewType}
          onClick={() => onViewChange(view)}
          className={`h-7 shrink-0 rounded-md border-0 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocrs-ring ${
            view === viewType
              ? "bg-ocrs-white text-ocrs-primary-text ocrs-shadow-xs"
              : "text-ocrs-muted-foreground hover:bg-ocrs-accent hover:text-ocrs-accent-foreground"
          }`}
        >
          {labels.views[view]}
        </button>
      ))}
    </div>
  );

  const step = "rs-no-print h-8 rounded-none px-2 text-ocrs-muted-foreground";

  return (
    <div
      className={withClass(
        "rs-toolbar sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b bg-ocrs-white px-4 py-3",
        classNames.toolbar
      )}
    >
      {/* Announces the new period when the user navigates. */}
      <div className="min-w-0" aria-live="polite">
        <span className="block truncate text-lg font-semibold tracking-tight text-ocrs-foreground md:text-xl">
          {getDateTitle()}
        </span>
        <span className="sr-only">{labels.viewTitle(labels.views[viewType])}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rs-nav inline-flex items-center overflow-hidden rounded-lg border bg-ocrs-white ocrs-shadow-xs">
          <Button
            variant="ghost"
            size="sm"
            className={step}
            aria-label={labels.previousPeriod}
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className={arrow} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rs-no-print h-8 rounded-none border-x px-3 font-medium text-ocrs-foreground"
            aria-label={labels.today}
            onClick={onGoToToday}
          >
            {labels.today}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={step}
            aria-label={labels.nextPeriod}
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className={arrow} />
          </Button>
        </div>
        {viewSwitch}
      </div>
    </div>
  );
};
