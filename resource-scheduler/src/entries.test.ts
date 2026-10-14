import { describe, expect, it } from "vitest";
import * as headless from "./headless";
import * as main from "./index";

// The package has two kinds of entry: the main one (components, hooks and
// helpers) and the ones without React. Adding the headless entry must not take
// anything from the main one.

// Every runtime export of "resource-scheduler" before the headless entry existed.
const MAIN_BEFORE = [
  "EmptySlotItem",
  "EventItem",
  "ResourceColumn",
  "ResourceScheduler",
  "SchedulerControls",
  "TimelineGrid",
  "TimelineHeader",
  "ViewType",
  "columnUtilization",
  "defaultLabels",
  "expandEvents",
  "splitRecurrence",
  "editOccurrence",
  "expandRecurrence",
  "findAvailableSlots",
  "formatEventTime",
  "formatRangeLabel",
  "formatSlotLabel",
  "getDatesInView",
  "getDropRange",
  "getEventSpan",
  "getEventStartPosition",
  "getResizeRange",
  "getRowWindow",
  "getSelectionBounds",
  "getTimeSlots",
  "getUtilization",
  "getVisibleEvents",
  "getVisibleRange",
  "groupUtilization",
  "isCellUnavailable",
  "isPlacementAllowed",
  "isSlotInRange",
  "isToday",
  "isValidTimeZone",
  "navigateDate",
  "rangesOverlap",
  "resolveBusinessHours",
  "resolveSlotOptions",
  "scrollToDate",
  "touchesUnavailable",
  "useEventCreation",
  "useHeadsObserver",
  "useIsMobile",
  "useMediaQuery",
  "useScheduler",
  "utcToZoned",
  "withEvents",
  "zonedToUtc",
];

describe("package entries", () => {
  it("keeps everything the main entry exported", () => {
    const missing = MAIN_BEFORE.filter((name) => !(name in main));
    expect(missing).toEqual([]);
  });

  it("adds the state hook next to the headless store it is made from", () => {
    expect(typeof main.useSchedulerState).toBe("function");
    expect(typeof headless.createSchedulerStore).toBe("function");
  });

  it("shares one implementation between the main and the headless entry", () => {
    const shared = Object.keys(headless).filter((name) => name in main);
    expect(shared.length).toBeGreaterThan(30);
    for (const name of shared) {
      expect((headless as Record<string, unknown>)[name], name).toBe((main as Record<string, unknown>)[name]);
    }
  });
});
