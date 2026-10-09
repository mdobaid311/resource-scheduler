import { describe, expect, it, vi } from "vitest";
import { ViewType } from "../types";
import { scrollToDate } from "./scrollUtils";

const scroller = (clientWidth: number) =>
  ({ clientWidth, scrollTo: vi.fn() }) as unknown as HTMLDivElement & {
    scrollTo: ReturnType<typeof vi.fn>;
  };

describe("scrollToDate", () => {
  // Saturday: column 6 of its week. 6 * 140 + 70 = 910 is the slot centre.
  const saturday = new Date(2024, 2, 16);

  it("centres the date in the viewport", () => {
    const el = scroller(600);
    scrollToDate(saturday, ViewType.Week, el, "90px", "140px");
    expect(el.scrollTo).toHaveBeenCalledWith({ left: 610, behavior: "smooth" });
  });

  it("centres within the area right of the sticky resource column", () => {
    const el = scroller(600);
    scrollToDate(saturday, ViewType.Week, el, "90px", "140px", 200);
    // visible timeline width is 600 - 200 = 400
    expect(el.scrollTo).toHaveBeenCalledWith({ left: 710, behavior: "smooth" });
  });
});
