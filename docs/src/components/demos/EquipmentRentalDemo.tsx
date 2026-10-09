import { useRef, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type {
  ResourceInput,
  ResourceSchedulerHandle,
  SchedulerEvent,
  SlotSelection,
} from "@scheduler/types";
import { findAvailableSlots } from "@scheduler/utils/availability";
import { withEvents } from "@scheduler/utils/events";
import { rangesOverlap } from "@scheduler/utils/placement";
import { Frame } from "./Frame";
import { AMBER, BLUE, GREEN, ROSE, TEAL, VIOLET, weekDay } from "./sample";

// `capacity` is how many units are in stock: a pool is one row, however many units it holds.
const items: ResourceInput[] = [
  { id: "projector", name: "Projector (3 units)", capacity: 3 },
  { id: "camera", name: "Camera kit (2 units)", capacity: 2 },
  { id: "pa", name: "PA system", unavailable: [{ start: weekDay(2), end: weekDay(3) }] }, // serviced on Wednesday
  { id: "van", name: "Van" },
];

// A rental is whole days: `end` is exclusive, so the last day rented is `last`.
const rental = (id: string, resourceId: string, customer: string, first: number, last: number, color: string): SchedulerEvent => ({
  id,
  title: customer,
  resourceId,
  startDate: weekDay(first),
  endDate: weekDay(last + 1),
  color,
});

const initial = (): SchedulerEvent[] => [
  rental("r1", "projector", "Acme Co", 0, 2, BLUE),
  rental("r2", "projector", "Bright School", 1, 1, TEAL),
  rental("r3", "projector", "Cafe Nord", 1, 3, VIOLET),
  rental("r4", "camera", "Studio 9", 0, 1, AMBER),
  rental("r5", "camera", "Dana W.", 1, 3, ROSE),
  rental("r6", "pa", "Wedding", 4, 6, GREEN),
  rental("r7", "van", "Move-out", 0, 1, BLUE),
  rental("r8", "van", "Delivery", 3, 3, TEAL),
];

// Whether one more booking on [start, end) fits next to `others` without more than
// `capacity` at any moment. The count only changes where a booking starts, so check those.
const fits = (others: SchedulerEvent[], start: Date, end: Date, capacity: number) => {
  const busy = others.filter((e) => rangesOverlap(start, end, e.startDate, e.endDate));
  const moments = [start, ...busy.map((e) => e.startDate).filter((t) => t > start)];
  return moments.every((t) => busy.filter((e) => e.startDate <= t && t < e.endDate).length < capacity);
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Equipment pools with a capacity, whole-day rentals, a service day, and "find me N free days". */
export default function EquipmentRentalDemo() {
  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const [draft, setDraft] = useState<SlotSelection | null>(null);
  const [customer, setCustomer] = useState("");
  const [log, setLog] = useState("");
  const [days, setDays] = useState(3);
  const [item, setItem] = useState("pa");
  const ref = useRef<ResourceSchedulerHandle>(null);
  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  const change = (event: SchedulerEvent, resourceId: string, start: Date, end: Date) => {
    setEvents((all) => all.map((e) => (e.id === event.id ? { ...e, resourceId, startDate: start, endDate: end } : e)));
    setLog(`Moved ${event.title} to ${nameOf(resourceId)}`);
  };

  const find = () => {
    const resource = withEvents(items, events).find((r) => r.id === item)!;
    const from = startOfToday();
    const to = new Date(from);
    to.setDate(to.getDate() + 120);
    const [slot] = findAvailableSlots(resource, { from, to, duration: days * 1440, step: 1440, limit: 1 });
    if (!slot) return setLog(`No ${days} free days for ${resource.name} in the next 120 days`);
    ref.current?.goTo(slot.start);
    setLog(`${resource.name} is free for ${days} days from ${slot.start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`);
  };

  return (
    <Frame
      height={690}
      log={log}
      controls={
        <>
          <label>
            Find
            <select aria-label="Days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 2, 3, 5].map((n) => (
                <option key={n} value={n}>
                  {n} free {n === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
            for
            <select aria-label="Item" value={item} onChange={(e) => setItem(e.target.value)}>
              <option value="pa">PA system</option>
              <option value="van">Van</option>
            </select>
          </label>
          <button type="button" onClick={find}>
            Find
          </button>
        </>
      }
      caption="Tuesday is full for the projectors and the PA system is serviced on Wednesday: neither accepts a booking there. Select days in a row to rent, or drag a rental to another day or item. The bars count unit-days rented against unit-days in stock."
    >
      {draft && (
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            setEvents((all) => [
              ...all,
              { id: `r-${Date.now()}`, title: customer.trim() || "Customer", resourceId: draft.resourceId, startDate: draft.start, endDate: draft.end, color: GREEN },
            ]);
            setLog(`Rented ${nameOf(draft.resourceId)}`);
            setCustomer("");
            setDraft(null);
          }}
        >
          <span>{nameOf(draft.resourceId)}</span>
          <input autoFocus type="text" placeholder="Customer" aria-label="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <button type="submit">Rent</button>
          <button type="button" className="secondary" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}
      <div style={{ height: draft ? 630 : 690 }}>
        <ResourceScheduler
          ref={ref}
          resources={items}
          events={events}
          initialView={ViewType.Week}
          availableViews={[ViewType.Week, ViewType.Month]}
          weekStartsOn={1}
          showUtilization
          blockUnavailable
          resourceColumnWidth="190px"
          dateColumnWidth="110px"
          ariaLabel="Equipment rentals"
          onSlotSelect={setDraft}
          onEventDrop={(event, _from, to, start, end) => change(event, to, start, end)}
          // More bookings at once than units in stock: refuse. This also covers a single unit.
          isValidDrop={(event, { resourceId, start, end }) =>
            fits(
              events.filter((e) => e.resourceId === resourceId && e.id !== event.id),
              start,
              end,
              items.find((i) => i.id === resourceId)?.capacity ?? 1
            )
          }
        />
      </div>
    </Frame>
  );
}
