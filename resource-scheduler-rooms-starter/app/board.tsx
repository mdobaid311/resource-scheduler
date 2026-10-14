"use client";

import { useState } from "react";
import { ResourceScheduler, ViewType } from "resource-scheduler";
import type { SchedulerEvent, SlotSelection } from "resource-scheduler";
import "resource-scheduler/dist/resource-scheduler.css";
import type { BookingDTO } from "@/lib/dto";
import { bookingRules } from "@/lib/rules";

type Room = { id: string; name: string };

const PENDING = "pending-";

const toEvent = (b: BookingDTO): SchedulerEvent => ({
  id: b.id,
  title: b.title,
  resourceId: b.roomId,
  startDate: new Date(b.startsAt),
  endDate: new Date(b.endsAt),
});

async function send(url: string, method: "POST" | "PATCH", body: unknown): Promise<BookingDTO> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // a Date becomes an ISO string
  });
  if (response.status === 409) throw new Error("Someone just booked that time.");
  if (!response.ok) throw new Error("The booking could not be saved.");
  return response.json();
}

export function Board({ rooms, initial, initialDate }: { rooms: Room[]; initial: BookingDTO[]; initialDate: string }) {
  const [bookings, setBookings] = useState(() => initial.map(toEvent));
  const [start] = useState(() => new Date(initialDate));
  const [draft, setDraft] = useState<SlotSelection | null>(null);
  const [message, setMessage] = useState("");

  async function book(slot: SlotSelection, title: string) {
    const tempId = PENDING + crypto.randomUUID();
    setMessage("");
    setBookings((all) => [
      ...all,
      { id: tempId, title, resourceId: slot.resourceId, startDate: slot.start, endDate: slot.end, color: "#94a3b8" },
    ]);
    try {
      const saved = toEvent(await send("/api/bookings", "POST", { roomId: slot.resourceId, title, startsAt: slot.start, endsAt: slot.end }));
      setBookings((all) => all.map((b) => (b.id === tempId ? saved : b)));
    } catch (error) {
      setBookings((all) => all.filter((b) => b.id !== tempId)); // roll back
      setMessage((error as Error).message);
    }
  }

  async function reschedule(event: SchedulerEvent, roomId: string, startDate: Date, endDate: Date) {
    if (event.id.startsWith(PENDING)) return; // not saved yet, so there is nothing to patch
    const before = bookings.find((b) => b.id === event.id);
    setMessage("");
    setBookings((all) => all.map((b) => (b.id === event.id ? { ...b, resourceId: roomId, startDate, endDate } : b)));
    try {
      await send(`/api/bookings/${event.id}`, "PATCH", { roomId, startsAt: startDate, endsAt: endDate });
    } catch (error) {
      if (before) setBookings((all) => all.map((b) => (b.id === event.id ? before : b))); // roll back
      setMessage((error as Error).message);
    }
  }

  return (
    <>
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            book(draft, String(new FormData(e.currentTarget).get("title")));
            setDraft(null);
          }}
        >
          <input name="title" aria-label="Title" placeholder="Meeting title" required autoFocus />
          <button type="submit">Book</button>
          <button type="button" onClick={() => setDraft(null)}>Cancel</button>
        </form>
      )}
      {message && <p role="alert">{message}</p>}
      <div style={{ height: 440 }}>
        <ResourceScheduler
          {...bookingRules}
          resources={rooms}
          events={bookings}
          initialDate={start}
          initialView={ViewType.Day}
          allowViewChange={false}
          slotDuration={30}
          dayStartHour={8}
          dayEndHour={18}
          ariaLabel="Meeting room bookings"
          onSlotSelect={setDraft}
          onEventDrop={(event, _from, to, s, e) => reschedule(event, to, s, e)}
          onEventResize={(event, roomId, s, e) => reschedule(event, roomId, s, e)}
        />
      </div>
    </>
  );
}
