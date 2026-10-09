// src/components/ResourceScheduler/utils/scrollUtils.ts
import { isSameDay, isSameHour } from "date-fns";
import { getTimeSlots, getDatesInView } from "./dateUtils";
import { ViewType } from "../types";

/**
 * Smooth-scrolls `scroller` so `date` sits in the middle of the visible
 * timeline. `stickyOffset` is the width of the sticky resource column, which
 * covers the left edge of the scroller and is not part of the timeline area.
 * Column widths must be px values.
 */
export const scrollToDate = (
  date: Date,
  viewType: ViewType,
  scroller: HTMLDivElement,
  timeColumnWidth: string,
  dateColumnWidth: string,
  stickyOffset = 0
) => {
  const datesInView = getDatesInView(date, viewType);
  const timeSlots = getTimeSlots(date, viewType);

  let targetIndex = -1;

  if (viewType === ViewType.Day) {
    targetIndex = timeSlots.findIndex(
      (slot) => isSameHour(slot, date) && isSameDay(slot, date)
    );
  } else {
    targetIndex = datesInView.findIndex((d) => isSameDay(d, date));
  }

  if (targetIndex === -1) return;

  const slotWidth =
    viewType === ViewType.Day
      ? parseInt(timeColumnWidth.replace("px", ""))
      : parseInt(dateColumnWidth.replace("px", ""));

  scroller.scrollTo({
    left:
      targetIndex * slotWidth +
      slotWidth / 2 -
      (scroller.clientWidth - stickyOffset) / 2,
    behavior: "smooth",
  });
};
