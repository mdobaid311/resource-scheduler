import { Prisma } from "@prisma/client";
import { Conflict, NotFound } from "./bookings";

// body comes from request.json(), so nothing in it is trusted.
export function parseSlot(body: { roomId?: unknown; startsAt?: unknown; endsAt?: unknown }) {
  const start = new Date(body.startsAt as string);
  const end = new Date(body.endsAt as string);
  if (typeof body.roomId !== "string" || !(start < end)) return null; // also catches Invalid Date
  return { roomId: body.roomId, start, end };
}

export function fail(error: unknown) {
  if (error instanceof Conflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
    return Response.json({ error: "That time was just booked." }, { status: 409 });
  }
  if (error instanceof NotFound) return Response.json({ error: "Not found." }, { status: 404 });
  throw error;
}
