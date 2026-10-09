import { de, enGB } from "date-fns/locale";
import { describe, expect, it } from "vitest";
import { createFormat, defaultLabels, resolveI18n } from "./i18n";

// Wednesday 7 October 2026, 9:30 and 9:00.
const at930 = new Date(2026, 9, 7, 9, 30);
const at900 = new Date(2026, 9, 7, 9);

describe("createFormat without a locale", () => {
  const f = createFormat(resolveI18n({}));

  it("keeps the English output the scheduler always had", () => {
    expect(f.time(at930)).toBe("9:30 AM");
    expect(f.hourHeader(at900)).toBe("9AM");
    expect(f.hourHeader(at930)).toBe("9:30AM");
    expect(f.weekday(at930)).toBe("Wed");
    expect(f.dayOfMonth(at930)).toBe("7");
    expect(f.monthShort(at930)).toBe("Oct");
    expect(f.monthYear(at930)).toBe("October 2026");
    expect(f.quarterYear(at930)).toBe("Q4 2026");
    expect(f.titleDay(at930)).toBe("October 7, 2026");
    expect(f.titleDateStart(at930)).toBe("Oct 7");
    expect(f.titleDateEnd(at930)).toBe("Oct 7, 2026");
    expect(f.dateTime(at930)).toBe("Oct 7, 2026 9:30 AM");
    expect(f.fullDate(at930)).toBe("Wednesday, October 7, 2026");
    expect(f.fullDateTime(at930)).toBe("Wednesday, October 7, 9:30 AM");
    expect(f.fullDayMonth(at930)).toBe("Wednesday, October 7");
  });

  it("uses 24-hour time when hour12 is false", () => {
    const f24 = createFormat(resolveI18n({ hour12: false }));
    expect(f24.time(at930)).toBe("09:30");
    expect(f24.hourHeader(at900)).toBe("09:00");
    expect(f24.fullDateTime(at930)).toBe("Wednesday, October 7, 09:30");
  });
});

describe("createFormat with a locale", () => {
  const f = createFormat(resolveI18n({ locale: de }));

  it("names days and months in that language", () => {
    expect(f.weekday(at930)).toBe("Mi.");
    expect(f.monthShort(at930)).toBe("Okt");
    expect(f.monthYear(at930)).toBe("Oktober 2026");
  });

  it("uses the locale's own date format", () => {
    expect(f.titleDay(at930)).toBe("7. Oktober 2026");
    expect(f.fullDate(at930)).toBe("Mittwoch, 7. Oktober 2026");
  });

  it("follows the clock the locale uses (German is 24-hour)", () => {
    expect(f.uses12Hour).toBe(false);
    expect(f.time(at930)).toBe("09:30");
    expect(f.hourHeader(at900)).toBe("09:00");
  });

  it("reads the clock from the locale, so British English is 24-hour", () => {
    expect(createFormat(resolveI18n({ locale: enGB })).uses12Hour).toBe(false);
  });

  it("lets hour12 override the locale's clock", () => {
    const twelve = createFormat(resolveI18n({ locale: de, hour12: true }));
    expect(twelve.uses12Hour).toBe(true);
    expect(twelve.time(at930)).toBe("9:30 vorm."); // the locale's own AM
  });
});

describe("resolveI18n", () => {
  it("returns the English labels by default", () => {
    expect(resolveI18n({}).labels).toEqual(defaultLabels);
    expect(defaultLabels.today).toBe("Today");
    expect(defaultLabels.views.week).toBe("Week");
  });

  it("merges the labels you give over the defaults, including nested ones", () => {
    const { labels } = resolveI18n({
      labels: {
        today: "Heute",
        views: { week: "Woche" },
        announce: { cantGoFurther: "Weiter geht es nicht." },
      },
    });
    expect(labels.today).toBe("Heute");
    expect(labels.resources).toBe("Resources");
    expect(labels.views.week).toBe("Woche");
    expect(labels.views.day).toBe("Day");
    expect(labels.announce.cantGoFurther).toBe("Weiter geht es nicht.");
    expect(labels.announce.cancelled("X")).toBe("Cancelled. X stays where it was.");
  });
});
