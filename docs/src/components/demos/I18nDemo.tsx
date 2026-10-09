import { useMemo, useState } from "react";
import { ar as arLocale, de as deLocale, es as esLocale, fr as frLocale, ja as jaLocale } from "date-fns/locale";
import type { Locale } from "date-fns";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { PartialLabels } from "@scheduler/i18n";
import { Frame } from "./Frame";
import { ar, de, es, fr, ja } from "./labels";
import { teamDay } from "./sample";
import { useSchedule } from "./useSchedule";

const LANGUAGES: Record<
  string,
  { locale?: Locale; labels?: PartialLabels; dir?: "ltr" | "rtl" }
> = {
  "English (default)": {}, // no locale: the English the scheduler always had
  Deutsch: { locale: deLocale, labels: de },
  Español: { locale: esLocale, labels: es },
  Français: { locale: frLocale, labels: fr },
  "日本語 (toolbar only)": { locale: jaLocale, labels: ja },
  "العربية (right to left, toolbar only)": { locale: arLocale, labels: ar, dir: "rtl" },
};

/** locale, hour12 and labels. */
export default function I18nDemo() {
  const { resources, move, resize, log } = useSchedule(teamDay);
  const [language, setLanguage] = useState("Deutsch");
  const [clock, setClock] = useState<"locale" | "12" | "24">("locale");
  const { locale, labels, dir } = LANGUAGES[language];
  const hour12 = useMemo(() => (clock === "locale" ? undefined : clock === "12"), [clock]);

  return (
    <Frame
      height={380}
      log={log}
      controls={
        <>
          <label>
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {Object.keys(LANGUAGES).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Clock
            <select value={clock} onChange={(e) => setClock(e.target.value as typeof clock)}>
              <option value="locale">the locale's</option>
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </label>
        </>
      }
      caption="The toolbar, headers, dates, the first day of the week and what a screen reader hears all follow the language."
    >
      <ResourceScheduler
        key={language}
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Day, ViewType.Week, ViewType.Month]}
        locale={locale}
        hour12={hour12}
        dir={dir}
        labels={labels}
        resourceColumnWidth="150px"
        timeColumnWidth="80px"
        dateColumnWidth="110px"
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
