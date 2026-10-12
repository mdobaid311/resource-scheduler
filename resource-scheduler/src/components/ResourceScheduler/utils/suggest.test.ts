import { describe, expect, it, vi } from "vitest";
import type { BusinessHours, Resource, SchedulerEvent } from "../types";
import { isPlacementAllowed, type PlacementRules } from "./placement";
import { expandEvents } from "./recurrence";
import { getUtilization } from "./utilization";
import { suggestResources, type Suggestion } from "./suggest";

// October 2026: Mon the 5th, Wed the 7th, Sat the 10th, Sun the 11th.
const d = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute);
const event = (id: string, start: Date, end: Date, title = id): SchedulerEvent => ({
  id,
  title,
  startDate: start,
  endDate: end,
});
const res = (id: string, extra: Partial<Resource> = {}): Resource => ({
  id,
  name: id,
  events: [],
  ...extra,
});
const office: BusinessHours = {}; // the defaults: Monday to Friday, 9 to 17
const wednesday = { from: d(7, 8), to: d(7, 18), duration: 60 };

const at = (hour: number, minute = 0) => hour * 60 + minute;
const summary = (suggestions: Suggestion[]) =>
  suggestions.map((s) => [s.resourceId, s.start.getHours() * 60 + s.start.getMinutes()]);

describe("suggestResources: search a window", () => {
  const ann = res("ann", { events: [event("a", d(7, 9), d(7, 11))] });
  const bob = res("bob");
  const cat = res("cat", { events: [event("c", d(7, 9), d(7, 10))] });

  it("gives each resource its earliest free slot, earliest first", () => {
    const got = suggestResources([ann, bob, cat], wednesday, { businessHours: office });
    expect(summary(got)).toEqual([
      ["bob", at(9)],
      ["cat", at(10)],
      ["ann", at(11)],
    ]);
    expect(got[0].end).toEqual(d(7, 10));
  });

  it("breaks ties in resource order", () => {
    const a = res("a");
    const b = res("b");
    expect(summary(suggestResources([a, b], wednesday, { businessHours: office }))).toEqual([
      ["a", at(9)],
      ["b", at(9)],
    ]);
    expect(summary(suggestResources([b, a], wednesday, { businessHours: office }))).toEqual([
      ["b", at(9)],
      ["a", at(9)],
    ]);
  });

  it("leaves out resources with no free slot", () => {
    const full = res("full", { events: [event("x", d(7, 8), d(7, 18))] });
    expect(suggestResources([full, bob], wednesday).map((s) => s.resourceId)).toEqual(["bob"]);
    expect(suggestResources([full], wednesday)).toEqual([]);
  });

  it("finds nothing when no resource is open", () => {
    const sunday = { from: d(11, 8), to: d(11, 18), duration: 60 };
    expect(suggestResources([ann, bob], sunday, { businessHours: office })).toEqual([]);
  });

  it("honours the step", () => {
    const busy = res("busy", { events: [event("x", d(7, 9), d(7, 9, 45))] });
    const quarter = suggestResources([busy], { ...wednesday, step: 15 }, { businessHours: office });
    expect(summary(quarter)).toEqual([["busy", at(9, 45)]]);
    const half = suggestResources([busy], wednesday, { businessHours: office });
    expect(summary(half)).toEqual([["busy", at(10)]]);
  });

  it("reports the share of the window that is booked", () => {
    const [first] = suggestResources([ann], { from: d(7, 9), to: d(7, 17), duration: 60 }, { businessHours: office });
    expect(first.utilization).toBe(0.25); // 2 of 8 hours
  });

  it("does not change what it is given", () => {
    const frozen = [
      res("ann", {
        capacity: 2,
        unavailable: [{ start: d(7, 12), end: d(7, 13) }],
        events: [{ ...event("r", d(5, 9), d(5, 10)), recurrence: { freq: "daily" as const, count: 5 } }],
      }),
    ];
    const copy = structuredClone(frozen);
    Object.freeze(frozen[0].events);
    Object.freeze(frozen[0].unavailable);
    Object.freeze(frozen[0]);
    Object.freeze(frozen);
    suggestResources(frozen, wednesday, { businessHours: office });
    expect(frozen).toEqual(copy);
  });

  it("returns nothing for empty or impossible requests", () => {
    expect(suggestResources([], wednesday)).toEqual([]);
    expect(suggestResources([bob], { ...wednesday, duration: 0 })).toEqual([]);
    expect(suggestResources([bob], { from: d(7, 10), to: d(7, 10), duration: 30 })).toEqual([]);
    expect(suggestResources([bob], { from: d(7, 10), to: d(7, 9), duration: 30 })).toEqual([]);
    expect(suggestResources([bob], { from: d(7, 9), to: d(7, 9, 30), duration: 60 })).toEqual([]);
    expect(suggestResources([bob], wednesday, { limit: 0 })).toEqual([]);
  });
});

describe("suggestResources: availability", () => {
  it("avoids unavailable time", () => {
    const leave = res("leave", { unavailable: [{ start: d(7, 9), end: d(7, 12) }] });
    expect(summary(suggestResources([leave], wednesday, { businessHours: office }))).toEqual([["leave", at(12)]]);
  });

  it("lets a resource's own hours win, and false means always open", () => {
    const late = res("late", { businessHours: { startHour: 13, endHour: 17 } });
    const always = res("always", { businessHours: false });
    expect(summary(suggestResources([late, always], wednesday, { businessHours: office }))).toEqual([
      ["always", at(8)],
      ["late", at(13)],
    ]);
  });

  it("keeps a slot inside business hours", () => {
    const close = { from: d(7, 16), to: d(7, 20), duration: 120 };
    expect(suggestResources([res("r")], close, { businessHours: office })).toEqual([]);
  });

  it("counts a resource that is never open as having no slots", () => {
    const never = res("never", { businessHours: { daysOfWeek: [] } });
    expect(suggestResources([never], wednesday)).toEqual([]);
  });

  it("expands recurring events", () => {
    // Daily 9 to 10 from Monday: the master itself is on the 5th, only an expansion blocks Wednesday.
    const standup = res("standup", {
      events: [{ ...event("s", d(5, 9), d(5, 10)), recurrence: { freq: "daily" as const } }],
    });
    expect(summary(suggestResources([standup], wednesday, { businessHours: office }))).toEqual([["standup", at(10)]]);
  });

  it("skips an exception of a recurring event", () => {
    const standup = res("standup", {
      events: [
        {
          ...event("s", d(5, 9), d(5, 10)),
          recurrence: { freq: "daily" as const, exceptions: [d(7)] },
        },
      ],
    });
    expect(summary(suggestResources([standup], wednesday, { businessHours: office }))).toEqual([["standup", at(9)]]);
  });
});

describe("suggestResources: capacity", () => {
  const twoBooked = (capacity: number | undefined) =>
    res("room", {
      capacity,
      events: [event("a", d(7, 9), d(7, 11)), event("b", d(7, 9), d(7, 11))],
    });

  it("treats a resource with one booking at a time as busy while it is booked", () => {
    const one = res("room", { events: [event("a", d(7, 9), d(7, 11))] });
    expect(summary(suggestResources([one], wednesday, { businessHours: office }))).toEqual([["room", at(11)]]);
  });

  it("offers a slot while fewer bookings run than its capacity", () => {
    const room = res("room", { capacity: 2, events: [event("a", d(7, 9), d(7, 11))] });
    expect(summary(suggestResources([room], wednesday, { businessHours: office }))).toEqual([["room", at(9)]]);
  });

  it("stops offering a slot when the capacity is used up", () => {
    expect(summary(suggestResources([twoBooked(2)], wednesday, { businessHours: office }))).toEqual([["room", at(11)]]);
    expect(summary(suggestResources([twoBooked(3)], wednesday, { businessHours: office }))).toEqual([["room", at(9)]]);
  });

  it("counts bookings that run at the same moment, not bookings that touch the slot", () => {
    // 9-10 and 10-11 never run together, so a two hour slot at 9 still has a free seat.
    const room = res("room", {
      capacity: 2,
      events: [event("a", d(7, 9), d(7, 10)), event("b", d(7, 10), d(7, 11))],
    });
    const long = { ...wednesday, duration: 120 };
    expect(summary(suggestResources([room], long, { businessHours: office }))).toEqual([["room", at(9)]]);
    expect(summary(suggestResources([{ ...room, capacity: 1 }], long, { businessHours: office }))).toEqual([
      ["room", at(11)],
    ]);
  });

  it("never offers a resource with no capacity", () => {
    expect(suggestResources([res("room", { capacity: 0 })], wednesday)).toEqual([]);
  });

  it("lets the rules still veto what capacity allows", () => {
    const room = res("room", { capacity: 2, events: [event("a", d(7, 9), d(7, 10))] });
    const strict = suggestResources([room], wednesday, { businessHours: office, eventOverlap: false });
    expect(summary(strict)).toEqual([["room", at(10)]]);
  });
});

describe("suggestResources: strategies", () => {
  const window = { from: d(7, 9), to: d(7, 17), duration: 60 }; // 8 open hours
  const ann = res("ann", { events: [event("a", d(7, 9), d(7, 13))] }); // 50%
  const bob = res("bob", { events: [event("b", d(7, 9), d(7, 10))] }); // 12.5%
  const cat = res("cat"); // 0%
  const options = { businessHours: office };

  it("ranks the least booked first", () => {
    const got = suggestResources([ann, bob, cat], window, { ...options, strategy: "least-booked" });
    expect(got.map((s) => s.resourceId)).toEqual(["cat", "bob", "ann"]);
    expect(got.map((s) => s.score)).toEqual([0, 0.125, 0.5]);
    expect(got.map((s) => s.utilization)).toEqual([0, 0.125, 0.5]);
    expect(summary(got)).toEqual([
      ["cat", at(9)],
      ["bob", at(10)],
      ["ann", at(13)],
    ]);
  });

  it("ranks the most booked first, to fill the busiest", () => {
    const got = suggestResources([cat, bob, ann], window, { ...options, strategy: "most-booked" });
    expect(got.map((s) => s.resourceId)).toEqual(["ann", "bob", "cat"]);
    expect(got.map((s) => s.utilization)).toEqual([0.5, 0.125, 0]);
  });

  it("breaks utilization ties in resource order, whatever the start", () => {
    const first = res("first", { events: [event("x", d(7, 9), d(7, 12)), event("y", d(7, 14), d(7, 15))] });
    const second = res("second", { events: [event("z", d(7, 12), d(7, 16))] }); // same 4 hours
    const got = suggestResources([first, second], window, { ...options, strategy: "least-booked" });
    expect(summary(got)).toEqual([
      ["first", at(12)],
      ["second", at(9)],
    ]);
    const reversed = suggestResources([second, first], window, { ...options, strategy: "most-booked" });
    expect(reversed.map((s) => s.resourceId)).toEqual(["second", "first"]);
  });

  it("ranks by a score function, lowest first", () => {
    const rank = vi.fn(({ resource }: { resource: Resource }) => (resource.id === "bob" ? 0 : 1));
    const got = suggestResources([ann, bob, cat], window, { ...options, strategy: rank });
    expect(got.map((s) => [s.resourceId, s.score])).toEqual([
      ["bob", 0],
      ["ann", 1],
      ["cat", 1],
    ]);
    expect(rank).toHaveBeenCalledWith({
      resource: ann,
      start: d(7, 13),
      end: d(7, 14),
      utilization: 0.5,
    });
  });

  it("drops candidates whose score is not a finite number", () => {
    const got = suggestResources([ann, bob, cat], window, {
      ...options,
      strategy: ({ resource }) => (resource.id === "bob" ? Infinity : resource.id === "cat" ? NaN : 1),
    });
    expect(got.map((s) => s.resourceId)).toEqual(["ann"]);
  });

  it("scores a resource's slots with the function, and takes its best", () => {
    const only = res("only");
    const got = suggestResources([only], { ...window, duration: 120 }, {
      ...options,
      // prefer the afternoon
      strategy: ({ start }) => (start.getHours() >= 13 ? 0 : 1),
    });
    expect(summary(got)).toEqual([["only", at(13)]]);
  });
});

describe("suggestResources: the rules", () => {
  const options = { businessHours: office };

  it("skips a slot that eventOverlap forbids", () => {
    const room = res("room", { capacity: 3, events: [event("a", d(7, 9), d(7, 10))] });
    expect(summary(suggestResources([room], wednesday, { ...options, eventOverlap: false }))).toEqual([["room", at(10)]]);
  });

  it("asks an eventOverlap function about each overlapping pair", () => {
    const room = (kind: string) => res("room", { capacity: 2, events: [event("a", d(7, 9), d(7, 10), kind)] });
    const job = event("job", d(7, 9), d(7, 10), "job");
    const allowTentative = (_moving: SchedulerEvent, other: SchedulerEvent) => other.title === "tentative";
    expect(
      summary(suggestResources([room("tentative")], { ...wednesday, event: job }, { ...options, eventOverlap: allowTentative }))
    ).toEqual([["room", at(9)]]);
    expect(
      summary(suggestResources([room("firm")], { ...wednesday, event: job }, { ...options, eventOverlap: allowTentative }))
    ).toEqual([["room", at(10)]]);
  });

  it("asks isValidDrop with the event and the placement, and only about slots that are free", () => {
    const busy = res("busy", { events: [event("x", d(7, 9), d(7, 11))] });
    const job = event("job", d(6, 9), d(6, 10));
    const isValidDrop = vi.fn((_event: SchedulerEvent, placement: { start: Date }) => placement.start.getHours() >= 13);
    const got = suggestResources([busy], { ...wednesday, event: job }, { ...options, isValidDrop });
    expect(summary(got)).toEqual([["busy", at(13)]]);
    for (const [seen, placement] of isValidDrop.mock.calls) {
      expect(seen).toBe(job);
      expect((placement as { resourceId?: string }).resourceId).toBe("busy");
      expect(placement.start.getHours()).toBeGreaterThanOrEqual(11); // 9:00 to 11:00 is booked, never asked
    }
  });

  it("gives the rules an event of the right length when none is passed", () => {
    const isValidDrop = vi.fn(() => true);
    suggestResources([res("r")], { ...wednesday, duration: 90 }, { ...options, isValidDrop });
    const [seen, placement] = isValidDrop.mock.calls[0] as unknown as [SchedulerEvent, { start: Date; end: Date }];
    expect(seen.endDate.getTime() - seen.startDate.getTime()).toBe(90 * 60_000);
    expect(placement.end.getTime() - placement.start.getTime()).toBe(90 * 60_000);
  });

  it("does not count the event being placed against a resource that already holds it", () => {
    const ann = res("ann", { events: [event("job", d(7, 9), d(7, 10))] });
    const job = ann.events[0];
    expect(summary(suggestResources([ann], wednesday, options))).toEqual([["ann", at(10)]]);
    expect(
      summary(suggestResources([ann], { ...wednesday, event: job }, { ...options, eventOverlap: false }))
    ).toEqual([["ann", at(9)]]);
  });

  it("only looks at the resources asked for, and lists them in resource order", () => {
    const rs = [res("ann"), res("bob"), res("cat")];
    expect(
      suggestResources(rs, wednesday, { ...options, resourceIds: ["cat", "ann", "nobody"] }).map((s) => s.resourceId)
    ).toEqual(["ann", "cat"]);
    expect(suggestResources(rs, wednesday, { ...options, resourceIds: [] })).toEqual([]);
  });
});

describe("suggestResources: limit and perResource", () => {
  const rs = [res("ann"), res("bob")];
  const morning = { from: d(7, 9), to: d(7, 12), duration: 60, step: 60 };
  const options = { businessHours: office };

  it("gives one slot per resource by default", () => {
    expect(summary(suggestResources(rs, morning, options))).toEqual([
      ["ann", at(9)],
      ["bob", at(9)],
    ]);
  });

  it("lists more slots per resource on request", () => {
    expect(summary(suggestResources(rs, morning, { ...options, perResource: 2 }))).toEqual([
      ["ann", at(9)],
      ["bob", at(9)],
      ["ann", at(10)],
      ["bob", at(10)],
    ]);
    expect(suggestResources(rs, morning, { ...options, perResource: Infinity })).toHaveLength(6);
  });

  it("cuts the ranked list at limit", () => {
    expect(summary(suggestResources(rs, morning, { ...options, perResource: Infinity, limit: 3 }))).toEqual([
      ["ann", at(9)],
      ["bob", at(9)],
      ["ann", at(10)],
    ]);
    expect(suggestResources(rs, morning, { ...options, limit: 1 }).map((s) => s.resourceId)).toEqual(["ann"]);
  });

  it("keeps one resource's slots together when they rank equally", () => {
    const got = suggestResources(rs, morning, { ...options, perResource: Infinity, strategy: "least-booked" });
    expect(summary(got)).toEqual([
      ["ann", at(9)],
      ["ann", at(10)],
      ["ann", at(11)],
      ["bob", at(9)],
      ["bob", at(10)],
      ["bob", at(11)],
    ]);
  });
});

describe("suggestResources: a fixed time", () => {
  const slot = { start: d(7, 10), end: d(7, 11) };
  const options = { businessHours: office };

  it("lists the resources that can take exactly that time", () => {
    const ann = res("ann", { events: [event("a", d(7, 10, 30), d(7, 12))] });
    const bob = res("bob");
    const cat = res("cat", { unavailable: [{ start: d(7, 10, 45), end: d(7, 11, 15) }] });
    const dee = res("dee", { businessHours: { startHour: 12, endHour: 20 } });
    const eve = res("eve", { events: [event("e", d(7, 11), d(7, 12))] }); // touches, does not overlap
    const got = suggestResources([ann, bob, cat, dee, eve], slot, options);
    expect(got.map((s) => s.resourceId)).toEqual(["bob", "eve"]);
    expect(got[0].start).toEqual(slot.start);
    expect(got[0].end).toEqual(slot.end);
  });

  it("measures how booked a resource is over the day, before the job", () => {
    const busyDay = res("busy", { events: [event("a", d(7, 13), d(7, 17))] });
    const quiet = res("quiet", { events: [event("q", d(7, 13), d(7, 14))] });
    const got = suggestResources([busyDay, quiet], slot, { ...options, strategy: "least-booked" });
    expect(got.map((s) => [s.resourceId, s.utilization])).toEqual([
      ["quiet", 1 / 8],
      ["busy", 0.5],
    ]);
  });

  it("applies the rules and capacity", () => {
    const room = res("room", { capacity: 2, events: [event("a", d(7, 10), d(7, 11))] });
    const full = res("full", { capacity: 1, events: [event("b", d(7, 10), d(7, 11))] });
    expect(suggestResources([room, full], slot, options).map((s) => s.resourceId)).toEqual(["room"]);
    expect(suggestResources([room, full], slot, { ...options, eventOverlap: false })).toEqual([]);
    expect(suggestResources([room, full], slot, { ...options, isValidDrop: () => false })).toEqual([]);
  });

  it("returns nothing for an empty range", () => {
    expect(suggestResources([res("r")], { start: d(7, 10), end: d(7, 10) })).toEqual([]);
    expect(suggestResources([res("r")], { start: d(7, 11), end: d(7, 10) })).toEqual([]);
  });

  it("measures a time that is not on the half hour exactly", () => {
    const r = res("r", { unavailable: [{ start: d(7, 10, 20), end: d(7, 10, 25) }] });
    expect(suggestResources([r], { start: d(7, 10, 25), end: d(7, 11, 5) }, options)).toHaveLength(1);
    expect(suggestResources([r], { start: d(7, 10, 24), end: d(7, 11, 5) }, options)).toHaveLength(0);
  });
});

// A slow reference that checks every minute and shares no code with suggestResources
// except the event expansion and the placement rules, which have their own tests.

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = <T>(random: () => number, items: T[]) => items[Math.floor(random() * items.length)];

const makeResources = (random: () => number): Resource[] =>
  Array.from({ length: 5 }, (_, i) => {
    const minute = () => d(5, 0, Math.floor(random() * 4 * 24 * 60));
    const events = Array.from({ length: Math.floor(random() * 7) }, (_, j) => {
      const start = minute();
      return event(`e${i}-${j}`, start, new Date(start.getTime() + (15 + Math.floor(random() * 16) * 15) * 60_000));
    });
    if (random() < 0.3) {
      const hour = 9 + Math.floor(random() * 5);
      events.push({
        ...event(`rec${i}`, d(5, hour), d(5, hour + 1 + Math.floor(random() * 3))),
        recurrence: { freq: "daily" as const, count: 1 + Math.floor(random() * 5), exceptions: random() < 0.5 ? [d(6)] : undefined },
      });
    }
    const unavailable = Array.from({ length: Math.floor(random() * 3) }, () => {
      const start = minute();
      return { start, end: new Date(start.getTime() + (1 + Math.floor(random() * 300)) * 60_000) };
    });
    return {
      id: `r${i}`,
      name: `R${i}`,
      events,
      unavailable,
      capacity: pick(random, [undefined, 1, 2, 3]),
      businessHours: pick<BusinessHours | false | undefined>(random, [
        undefined,
        undefined,
        false,
        { startHour: 8, endHour: 12, daysOfWeek: [1, 2, 3] },
        { startHour: 13, endHour: 21 },
      ]),
    };
  });

const makeRules = (random: () => number): PlacementRules => ({
  eventOverlap: pick<PlacementRules["eventOverlap"]>(random, [
    undefined,
    undefined,
    false,
    (_moving, other) => other.id.endsWith("0"),
  ]),
  isValidDrop: pick<PlacementRules["isValidDrop"]>(random, [
    undefined,
    undefined,
    (_event, { start }) => start.getHours() % 3 !== 0,
  ]),
});

// Whether the resource can take a booking at minute `t`, by walking the data.
const minuteFree = (resource: Resource, events: SchedulerEvent[], shared: BusinessHours | undefined, t: number) => {
  const hours = resource.businessHours === undefined ? shared : resource.businessHours || undefined;
  if (hours) {
    const days = hours.daysOfWeek ?? [1, 2, 3, 4, 5];
    const at = new Date(t);
    if (!days.includes(at.getDay())) return false;
    if (at.getHours() < (hours.startHour ?? 9) || at.getHours() >= (hours.endHour ?? 17)) return false;
  }
  if ((resource.unavailable ?? []).some((u) => t >= u.start.getTime() && t < u.end.getTime())) return false;
  const running = events.filter((e) => t >= e.startDate.getTime() && t < e.endDate.getTime()).length;
  return running < (resource.capacity ?? 1);
};

const slotFree = (resource: Resource, events: SchedulerEvent[], shared: BusinessHours | undefined, start: number, end: number) => {
  for (let t = start; t < end; t += 60_000) if (!minuteFree(resource, events, shared, t)) return false;
  return true;
};

describe("suggestResources against a minute-by-minute reference", () => {
  const job = event("job", d(5, 8), d(5, 9));

  for (let seed = 1; seed <= 25; seed++) {
    it(`finds exactly the placements the reference allows (seed ${seed})`, () => {
      const random = rng(seed);
      const resources = makeResources(random);
      const rules = makeRules(random);
      const duration = pick(random, [30, 60, 90, 120]);
      const request = { from: d(5, 7), to: d(7, 20), duration, step: 30 };
      const options = { businessHours: office, perResource: Infinity, event: job, ...rules };

      const expected: Suggestion[] = [];
      resources.forEach((resource) => {
        const events = expandEvents(resource.events, request.from, request.to);
        for (let t = request.from.getTime(); t + duration * 60_000 <= request.to.getTime(); t += 30 * 60_000) {
          const start = new Date(t);
          const end = new Date(t + duration * 60_000);
          if (!slotFree(resource, events, office, t, end.getTime())) continue;
          if (!isPlacementAllowed(job, { resourceId: resource.id, start, end }, [{ ...resource, events }], rules)) continue;
          expected.push({ resourceId: resource.id, start, end, score: t, utilization: null });
        }
      });
      // earliest first, then resource order
      const order = (id: string) => resources.findIndex((r) => r.id === id);
      expected.sort((a, b) => a.score - b.score || order(a.resourceId) - order(b.resourceId));

      const got = suggestResources(resources, request, options);
      expect(got.map(({ resourceId, start, end }) => ({ resourceId, start, end }))).toEqual(
        expected.map(({ resourceId, start, end }) => ({ resourceId, start, end }))
      );

      // Whatever it returns, the rules accept.
      for (const { resourceId, start, end } of got) {
        const resource = resources.find((r) => r.id === resourceId)!;
        const events = expandEvents(resource.events, request.from, request.to);
        expect(isPlacementAllowed(job, { resourceId, start, end }, [{ ...resource, events }], rules)).toBe(true);
      }
    });

    it(`keeps each resource's first slots when perResource is small (seed ${seed})`, () => {
      const random = rng(seed * 13);
      const resources = makeResources(random);
      const rules = pick(random, [{}, makeRules(random)]);
      const request = { from: d(5, 7), to: d(7, 20), duration: 60, step: 30 };
      const all = suggestResources(resources, request, { businessHours: office, perResource: Infinity, ...rules });
      for (const perResource of [1, 2]) {
        const expected = resources.flatMap((r) => all.filter((s) => s.resourceId === r.id).slice(0, perResource));
        const order = (id: string) => resources.findIndex((r) => r.id === id);
        expected.sort((a, b) => a.score - b.score || order(a.resourceId) - order(b.resourceId));
        const got = suggestResources(resources, request, { businessHours: office, perResource, ...rules });
        expect(got).toEqual(expected);
      }
    });

    it(`ranks by utilization like the reference (seed ${seed})`, () => {
      const random = rng(seed * 101);
      const resources = makeResources(random);
      const request = { from: d(5, 7), to: d(7, 20), duration: 60, step: 60 };
      for (const strategy of ["least-booked", "most-booked"] as const) {
        const got = suggestResources(resources, request, { businessHours: office, strategy });
        const ratio = (id: string) =>
          getUtilization(resources.find((r) => r.id === id)!, { start: request.from, end: request.to }, { businessHours: office })
            .ratio ?? 0;
        const order = (id: string) => resources.findIndex((r) => r.id === id);
        const sign = strategy === "least-booked" ? 1 : -1;
        const sorted = [...got].sort(
          (a, b) => sign * (ratio(a.resourceId) - ratio(b.resourceId)) || order(a.resourceId) - order(b.resourceId)
        );
        expect(got.map((s) => s.resourceId)).toEqual(sorted.map((s) => s.resourceId));
        for (const s of got) expect(s.utilization).toBe(ratio(s.resourceId));
      }
    });

    it(`only offers slots that are really free when the length is not a multiple of the step (seed ${seed})`, () => {
      const random = rng(seed * 7919);
      const resources = makeResources(random);
      const request = { from: d(5, 7), to: d(7, 20), duration: 45, step: 30 };
      const got = suggestResources(resources, request, { businessHours: office, perResource: Infinity });
      for (const { resourceId, start, end } of got) {
        const resource = resources.find((r) => r.id === resourceId)!;
        const events = expandEvents(resource.events, request.from, request.to);
        expect(slotFree(resource, events, office, start.getTime(), end.getTime())).toBe(true);
      }
    });

    it(`answers a fixed time like the reference (seed ${seed})`, () => {
      const random = rng(seed * 31);
      const resources = makeResources(random);
      const rules = makeRules(random);
      for (let i = 0; i < 8; i++) {
        const start = d(5 + Math.floor(random() * 3), Math.floor(random() * 22), Math.floor(random() * 60));
        const end = new Date(start.getTime() + (1 + Math.floor(random() * 240)) * 60_000);
        const expected = resources
          .filter((resource) => {
            const events = expandEvents(resource.events, start, end);
            return (
              slotFree(resource, events, office, start.getTime(), end.getTime()) &&
              isPlacementAllowed(job, { resourceId: resource.id, start, end }, [{ ...resource, events }], rules)
            );
          })
          .map((r) => r.id);
        const got = suggestResources([...resources], { start, end, event: job }, { businessHours: office, ...rules });
        expect(got.map((s) => s.resourceId)).toEqual(expected);
      }
    });
  }
});
