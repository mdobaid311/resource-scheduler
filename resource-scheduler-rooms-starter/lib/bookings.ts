import { Prisma } from "@prisma/client";
import { isPlacementAllowed } from "resource-scheduler/headless";
import type { Resource } from "resource-scheduler/headless";
import { prisma } from "./db";
import { bookingRules } from "./rules";

export class Conflict extends Error {}
export class NotFound extends Error {}

type Slot = { roomId: string; start: Date; end: Date };

const inTransaction = <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) =>
  prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

// Throws Conflict unless the booking `id` (none, for a new one) may take this slot.
async function assertFree(tx: Prisma.TransactionClient, id: string | undefined, { roomId, start, end }: Slot) {
  const room = await tx.room.findUnique({
    where: { id: roomId },
    include: { bookings: { where: { startsAt: { lt: end }, endsAt: { gt: start } } } },
  });
  if (!room) throw new NotFound();

  const resource: Resource = {
    id: room.id,
    name: room.name,
    events: room.bookings.map((b) => ({ id: b.id, title: b.title, startDate: b.startsAt, endDate: b.endsAt })),
  };
  const moving = { id: id ?? "new", title: "", startDate: start, endDate: end };

  if (!isPlacementAllowed(moving, { resourceId: roomId, start, end }, [resource], bookingRules)) {
    throw new Conflict();
  }
}

export const createBooking = (slot: Slot & { title: string }) =>
  inTransaction(async (tx) => {
    await assertFree(tx, undefined, slot);
    return tx.booking.create({
      data: { roomId: slot.roomId, title: slot.title, startsAt: slot.start, endsAt: slot.end },
    });
  });

export const moveBooking = (id: string, slot: Slot) =>
  inTransaction(async (tx) => {
    if (!(await tx.booking.findUnique({ where: { id } }))) throw new NotFound();
    await assertFree(tx, id, slot); // the booking's own old time is ignored: its id is `id`
    return tx.booking.update({
      where: { id },
      data: { roomId: slot.roomId, startsAt: slot.start, endsAt: slot.end },
    });
  });
