import type { Booking } from "@prisma/client";

export type BookingDTO = {
  id: string;
  title: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
};

export const toDTO = (b: Booking): BookingDTO => ({
  id: b.id,
  title: b.title,
  roomId: b.roomId,
  startsAt: b.startsAt.toISOString(),
  endsAt: b.endsAt.toISOString(),
});
