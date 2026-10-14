import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/dto";
import { Board } from "./board";

export const dynamic = "force-dynamic"; // read the database per request, not at build time

const DAY = 24 * 60 * 60 * 1000;

export default async function Page() {
  const now = new Date();
  const [rooms, bookings] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.booking.findMany({
      where: {
        endsAt: { gt: new Date(now.getTime() - DAY) },
        startsAt: { lt: new Date(now.getTime() + 14 * DAY) },
      },
    }),
  ]);

  return (
    <main style={{ padding: 16 }}>
      <Board
        rooms={rooms.map((r) => ({ id: r.id, name: `${r.name} (${r.seats} seats)` }))}
        initial={bookings.map(toDTO)}
        initialDate={now.toISOString()}
      />
    </main>
  );
}
