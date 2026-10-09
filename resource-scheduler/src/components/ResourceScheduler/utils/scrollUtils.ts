// src/components/ResourceScheduler/utils/scrollUtils.ts
import { isSameDay } from "date-fns";
import {
  getTimeSlots,
  getDatesInView,
  type SlotOptions,
  type ViewOptions,
} from "./dateUtils";
import { ViewType } from "../types";

/**
 * Smooth-scrolls `scroller` so `date` sits in the middle of the visible
 * timeline. `stickyOffset` is the width of the sticky resource column, which
 * covers the left edge of the scroller and is not part of the timeline area.
 * `slotOptions` must match the ones the day view was rendered with. Times
 * outside the visible hours scroll to the nearest edge slot. `rtl` is for a
 * right-to-left layout.
 * Column widths must be px values.
 */
export const scrollToDate = (
  date: Date,
  viewType: ViewType,
  scroller: HTMLDivElement,
  timeColumnWidth: string,
  dateColumnWidth: string,
  stickyOffset = 0,
  slotOptions?: SlotOptions,
  viewOptions?: ViewOptions,
  rtl = false
) => {
  let targetIndex = -1;

  if (viewType === ViewType.Day) {
    // The slot containing `date` is the last one starting at or before it.
    const timeSlots = getTimeSlots(date, viewType, slotOptions);
    const started = timeSlots.filter((slot) => slot <= date).length;
    targetIndex = timeSlots.length ? Math.max(0, started - 1) : -1;
  } else {
    targetIndex = getDatesInView(date, viewType, viewOptions).findIndex((d) =>
      isSameDay(d, date)
    );
  }

  if (targetIndex === -1) return;

  const slotWidth =
    viewType === ViewType.Day
      ? parseInt(timeColumnWidth.replace("px", ""))
      : parseInt(dateColumnWidth.replace("px", ""));

  const offset =
    targetIndex * slotWidth +
    slotWidth / 2 -
    (scroller.clientWidth - stickyOffset) / 2;

  // Right to left, the timeline starts at the right edge and scrollLeft
  // counts down from 0.
  scroller.scrollTo({ left: rtl ? -offset : offset, behavior: "smooth" });
};
