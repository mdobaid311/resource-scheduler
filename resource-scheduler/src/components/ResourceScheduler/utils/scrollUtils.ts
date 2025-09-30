// src/components/ResourceScheduler/utils/scrollUtils.ts
import { isSameDay, isSameHour } from "date-fns";
import { getTimeSlots, getDatesInView } from "./dateUtils";
import { ViewType } from "../types";

export const scrollToDate = (
  date: Date,
  viewType: ViewType,
  timelineElement: HTMLDivElement,
  timeColumnWidth: string,
  dateColumnWidth: string
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

  const scrollPosition = targetIndex * slotWidth;

  timelineElement.scrollTo({
    left: scrollPosition - timelineElement.clientWidth / 2 + slotWidth / 2,
    behavior: "smooth",
  });
};
