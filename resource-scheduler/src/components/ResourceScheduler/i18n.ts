// src/components/ResourceScheduler/i18n.ts
import { createContext, useContext } from "react";
import { format, type Locale } from "date-fns";
import type { ViewType } from "./types";

/** Every piece of text the scheduler shows or reads out, in English. */
export interface SchedulerLabels {
  /** Header of the resource column. */
  resources: string;
  today: string;
  previousPeriod: string;
  nextPeriod: string;
  /** Name of the view selector. */
  view: string;
  /** Accessible name of the grid when `ariaLabel` is not set. */
  gridName: string;
  /** Names of the views, in the selector. */
  views: Record<ViewType, string>;
  /** Under the period title: "Week View". */
  viewTitle: (viewName: string) => string;
  allDay: string;
  /** Said after a slot name that is outside business hours or time off. */
  unavailable: string;
  /** In a range read to screen readers: "9:00 AM to 10:00 AM". */
  to: string;
  /** Keyboard instructions, visually hidden. */
  help: (canResize: boolean) => string;
  /** Spoken through the live region. */
  announce: {
    pickedUp: (title: string, canResize: boolean) => string;
    moved: (title: string, place: string, allowed: boolean) => string;
    cantGoFurther: string;
    notAllowedHere: string;
    droppedNoChange: (title: string) => string;
    dropped: (title: string, place: string) => string;
    cancelled: (title: string) => string;
    selected: (slots: number) => string;
    selecting: (slots: number) => string;
    selectionCancelled: string;
  };
}

/** Labels you can override: any subset, also inside `views` and `announce`. */
export type PartialLabels = Partial<Omit<SchedulerLabels, "views" | "announce">> & {
  views?: Partial<SchedulerLabels["views"]>;
  announce?: Partial<SchedulerLabels["announce"]>;
};

const slots = (n: number) => `${n} slot${n === 1 ? "" : "s"}`;

export const defaultLabels: SchedulerLabels = {
  resources: "Resources",
  today: "Today",
  previousPeriod: "Previous period",
  nextPeriod: "Next period",
  view: "View",
  gridName: "Resource schedule",
  views: { day: "Day", week: "Week", month: "Month", quarter: "Quarter", year: "Year" },
  viewTitle: (viewName) => `${viewName} View`,
  allDay: "All day",
  unavailable: "unavailable",
  to: "to",
  help: (canResize) =>
    "Arrow keys move between slots. Enter or Space selects a slot; hold Shift with Left or Right to select several. " +
    "Tab to an event: Enter opens its details, Space picks it up, arrow keys move it" +
    (canResize ? ", Shift with Left or Right resizes it" : "") +
    ", Space drops it and Escape cancels.",
  announce: {
    pickedUp: (title, canResize) =>
      `Picked up ${title}. Arrow keys move it, Space drops it, Escape cancels.${
        canResize ? " Hold Shift with left or right arrow to resize." : ""
      }`,
    moved: (title, place, allowed) =>
      `${title}: ${place}${allowed ? "" : ". Not allowed here"}`,
    cantGoFurther: "Can't go any further.",
    notAllowedHere: "Not allowed here. Move somewhere else, or press Escape to cancel.",
    droppedNoChange: (title) => `Dropped ${title}, no change.`,
    dropped: (title, place) => `Dropped ${title}. ${place}`,
    cancelled: (title) => `Cancelled. ${title} stays where it was.`,
    selected: (n) => `Selected ${slots(n)}.`,
    selecting: (n) => `Selecting ${slots(n)}. Enter to confirm, Escape to cancel.`,
    selectionCancelled: "Selection cancelled.",
  },
};

/** What the app passes in. */
export interface I18nInput {
  /** A date-fns locale, for example `import { de } from "date-fns/locale"`. */
  locale?: Locale;
  /** `true` for a 12-hour clock, `false` for 24-hour. Default: what the locale uses. */
  hour12?: boolean;
  labels?: PartialLabels;
  /** Reading direction of the layout. Default "ltr". */
  dir?: "ltr" | "rtl";
}

export interface I18n {
  locale?: Locale;
  hour12?: boolean;
  labels: SchedulerLabels;
  dir: "ltr" | "rtl";
}

export const resolveI18n = ({ locale, hour12, labels, dir = "ltr" }: I18nInput = {}): I18n => ({
  locale,
  hour12,
  dir,
  labels: {
    ...defaultLabels,
    ...labels,
    views: { ...defaultLabels.views, ...labels?.views },
    announce: { ...defaultLabels.announce, ...labels?.announce },
  },
});

export interface Formatter {
  uses12Hour: boolean;
  /** "9:30 AM" or "09:30". */
  time: (d: Date) => string;
  /** Column header in the day view: "9AM", "9:30AM" or "09:00". */
  hourHeader: (d: Date) => string;
  weekday: (d: Date) => string;
  dayOfMonth: (d: Date) => string;
  monthShort: (d: Date) => string;
  /** "October 2026". */
  monthYear: (d: Date) => string;
  /** "Q4 2026". */
  quarterYear: (d: Date) => string;
  /** Title of the day view: "October 7, 2026". */
  titleDay: (d: Date) => string;
  /** Start and end of the week title: "Oct 5" and "Oct 9, 2026". */
  titleDateStart: (d: Date) => string;
  titleDateEnd: (d: Date) => string;
  /** "Oct 7, 2026 9:30 AM". */
  dateTime: (d: Date) => string;
  /** For screen readers. */
  fullDate: (d: Date) => string;
  fullDateTime: (d: Date) => string;
  fullDayMonth: (d: Date) => string;
}

/**
 * Date and time text for one locale. Without a locale it is exactly the
 * English the scheduler has always shown; with one, dates follow that
 * locale's own formats.
 */
export const createFormat = ({ locale, hour12 }: I18n): Formatter => {
  const f = (d: Date, pattern: string) => format(d, pattern, { locale });
  const uses12Hour =
    hour12 ??
    (locale ? /[hK]/.test(locale.formatLong?.time({ width: "short" }) ?? "h") : true);

  const time = (d: Date) => f(d, uses12Hour ? "h:mm a" : "HH:mm");
  return {
    uses12Hour,
    time,
    hourHeader: (d) =>
      f(d, uses12Hour ? (d.getMinutes() ? "h:mma" : "ha") : "HH:mm"),
    weekday: (d) => f(d, "EEE"),
    dayOfMonth: (d) => f(d, "d"),
    monthShort: (d) => f(d, "LLL"),
    monthYear: (d) => f(d, "LLLL yyyy"),
    quarterYear: (d) => f(d, "QQQ yyyy"),
    titleDay: (d) => f(d, locale ? "PPP" : "MMMM d, yyyy"),
    titleDateStart: (d) => f(d, locale ? "PP" : "MMM d"),
    titleDateEnd: (d) => f(d, locale ? "PP" : "MMM d, yyyy"),
    dateTime: (d) => `${f(d, locale ? "PP" : "MMM d, yyyy")} ${time(d)}`,
    fullDate: (d) => f(d, locale ? "PPPP" : "EEEE, MMMM d, yyyy"),
    fullDateTime: (d) => `${f(d, locale ? "PPPP" : "EEEE, MMMM d")}, ${time(d)}`,
    fullDayMonth: (d) => f(d, locale ? "PPPP" : "EEEE, MMMM d"),
  };
};

export interface I18nContextValue extends I18n {
  fmt: Formatter;
}

export const buildI18n = (input?: I18nInput): I18nContextValue => {
  const i18n = resolveI18n(input);
  return { ...i18n, fmt: createFormat(i18n) };
};

/** English, used when there is no provider so the exported parts still work. */
export const defaultI18n = buildI18n();

export const I18nContext = createContext<I18nContextValue>(defaultI18n);

export const useI18n = () => useContext(I18nContext);
