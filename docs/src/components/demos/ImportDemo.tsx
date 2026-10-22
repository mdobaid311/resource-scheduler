import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, SchedulerEvent } from "@scheduler/types";
import { icsToEvents } from "@scheduler/utils/importEvents";
import { Frame } from "./Frame";
import { at, rooms } from "./sample";

const pad = (n: number) => String(n).padStart(2, "0");
const floating = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

/** A small calendar file for today, with a location per room and one rule the scheduler cannot show. */
const sample = () =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:planning@example.com",
    "SUMMARY:Sprint planning",
    `DTSTART:${floating(at(0, 9))}`,
    `DTEND:${floating(at(0, 10, 30))}`,
    "LOCATION:Atlas (8 seats)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:interview@example.com",
    "SUMMARY:Interview\\, round 2",
    "DESCRIPTION:Bring the take-home\\nand a laptop",
    `DTSTART:${floating(at(0, 11))}`,
    `DTEND:${floating(at(0, 12))}`,
    "LOCATION:Borealis (4 seats)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:retro@example.com",
    "SUMMARY:Review (day 100 of the year)",
    `DTSTART:${floating(at(0, 14))}`,
    `DTEND:${floating(at(0, 15))}`,
    "RRULE:FREQ=YEARLY;BYYEARDAY=100",
    "LOCATION:Cirrus (12 seats)",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

const resources: ResourceInput[] = rooms().map(({ id, name }) => ({ id, name }));

/** icsToEvents on a calendar file: paste or open one, and see what comes out. */
export default function ImportDemo() {
  const [text, setText] = useState(sample);
  const read = (source: string) => {
    const warnings: string[] = [];
    return { events: icsToEvents(source, { resources, onWarning: (w) => warnings.push(w) }), warnings };
  };
  const [result, setResult] = useState<{ events: SchedulerEvent[]; warnings: string[] }>(() => read(text));

  return (
    <Frame
      height={340}
      log={`${result.events.length} ${result.events.length === 1 ? "event" : "events"} imported`}
      controls={
        <>
          <button type="button" onClick={() => setResult(read(text))}>
            Import
          </button>
          <label>
            Open a file
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const source = await file.text();
                setText(source);
                setResult(read(source));
              }}
            />
          </label>
        </>
      }
      caption={
        <>
          <textarea
            aria-label="Calendar file"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.75rem" }}
          />
          {result.warnings.length > 0 && (
            <ul aria-label="Import warnings" style={{ margin: "0.5rem 0 0" }}>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </>
      }
    >
      <ResourceScheduler
        resources={resources}
        events={result.events}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={8}
        dayEndHour={18}
        timeColumnWidth="80px"
        resourceColumnWidth="clamp(104px, 30vw, 170px)"
      />
    </Frame>
  );
}
